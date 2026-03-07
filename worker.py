"""
WizImage AI Worker
------------------
Run with:  python worker.py
Processes image jobs from the Redis queue using real AI models.

Models used:
  - Real-ESRGAN  (upscaling)
  - SwinIR       (upscaling alt)
  - rembg/U²-Net (background removal)
  - GFPGAN       (face restoration)
  - PIL/OpenCV   (enhancement)
"""
import asyncio, json, boto3, tempfile, os
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import aioredis

from database import AsyncSessionLocal, engine, Base
from models import ImageJob
from config import settings

s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)

async def download_s3(url: str, dest: Path):
    key = url.split(".amazonaws.com/", 1)[1]
    s3.download_file(settings.AWS_BUCKET_NAME, key, str(dest))

async def upload_s3(path: Path, folder: str = "outputs") -> str:
    key = f"{folder}/{path.name}"
    s3.upload_file(str(path), settings.AWS_BUCKET_NAME, key)
    return f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

# ── Upscale with Real-ESRGAN ──────────────────────────────────────────────────
async def process_upscale(input_path: Path, params: dict) -> Path:
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    import cv2, numpy as np
    import uuid

    scale = int(params.get("scale", "4x")[0])
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    upsampler = RealESRGANer(scale=4, model_path="weights/RealESRGAN_x4plus.pth", model=model, tile=0, tile_pad=10, pre_pad=0)

    img = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    output, _ = upsampler.enhance(img, outscale=scale)

    out_path = input_path.parent / f"{uuid.uuid4()}_upscaled.png"
    cv2.imwrite(str(out_path), output)
    return out_path

# ── Background Remove with rembg ──────────────────────────────────────────────
async def process_bg_remove(input_path: Path, params: dict) -> Path:
    from rembg import remove
    from PIL import Image
    import uuid

    with open(input_path, "rb") as f:
        result = remove(f.read())

    out_path = input_path.parent / f"{uuid.uuid4()}_nobg.png"
    with open(out_path, "wb") as f:
        f.write(result)
    return out_path

# ── Enhance with PIL ──────────────────────────────────────────────────────────
async def process_enhance(input_path: Path, params: dict) -> Path:
    from PIL import Image, ImageEnhance, ImageFilter
    import uuid

    img = Image.open(input_path).convert("RGB")

    def scale_factor(val: int) -> float:
        return 0.5 + (val / 100.0) * 1.5   # maps 0-100 → 0.5-2.0

    img = ImageEnhance.Brightness(img).enhance(scale_factor(params.get("brightness", 50)))
    img = ImageEnhance.Contrast(img).enhance(scale_factor(params.get("contrast", 50)))
    img = ImageEnhance.Sharpness(img).enhance(scale_factor(params.get("sharpness", 50)))
    img = ImageEnhance.Color(img).enhance(scale_factor(params.get("saturation", 50)))

    if params.get("denoise", 0) > 30:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    out_path = input_path.parent / f"{uuid.uuid4()}_enhanced.jpg"
    img.save(str(out_path), quality=95)
    return out_path

# ── Face Restore with GFPGAN ──────────────────────────────────────────────────
async def process_face_restore(input_path: Path, params: dict) -> Path:
    from gfpgan import GFPGANer
    import cv2, uuid

    restorer = GFPGANer(model_path="weights/GFPGANv1.4.pth", upscale=1, arch="clean", channel_multiplier=2)
    img = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    _, _, output = restorer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)

    out_path = input_path.parent / f"{uuid.uuid4()}_restored.png"
    cv2.imwrite(str(out_path), output)
    return out_path

# ── Dispatcher ────────────────────────────────────────────────────────────────
PROCESSORS = {
    "upscale_2x": process_upscale,
    "upscale_4x": process_upscale,
    "upscale_8x": process_upscale,
    "bg_remove":  process_bg_remove,
    "enhance":    process_enhance,
    "face_restore": process_face_restore,
}

async def handle_job(payload: dict):
    job_id = payload["job_id"]
    tool   = payload["tool"]
    params = payload.get("params", {})

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ImageJob).where(ImageJob.id == job_id))
        job    = result.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            with tempfile.TemporaryDirectory() as tmp:
                tmp_dir   = Path(tmp)
                in_path   = tmp_dir / "input.jpg"
                await download_s3(job.input_url, in_path)

                processor = PROCESSORS.get(tool)
                if not processor:
                    raise ValueError(f"Unknown tool: {tool}")

                out_path = await processor(in_path, params)
                output_url = await upload_s3(out_path)

            job.status       = "done"
            job.output_url   = output_url
            job.completed_at = datetime.now(timezone.utc)

        except Exception as e:
            print(f"[ERROR] Job {job_id} failed: {e}")
            job.status = "failed"
            job.error  = str(e)

        await db.commit()

# ── Main worker loop ──────────────────────────────────────────────────────────
async def main():
    print("[WizImage Worker] Starting…")
    redis = await aioredis.from_url(settings.REDIS_URL)

    while True:
        try:
            item = await redis.blpop("wizimage:jobs", timeout=5)
            if item:
                _, raw = item
                payload = json.loads(raw)
                print(f"[Worker] Processing job {payload['job_id']} ({payload['tool']})")
                await handle_job(payload)
        except Exception as e:
            print(f"[Worker] Error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())

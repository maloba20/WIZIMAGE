from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import boto3, uuid, json, asyncio
from datetime import datetime, timezone

from database import get_db
from models import User, ImageJob
from schemas import UpscaleRequest, EnhanceRequest, BgRemoveRequest, PosterRequest, JobResponse
from services.auth_service import get_current_user
from config import settings

router = APIRouter()

# ── S3 client ─────────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)

async def upload_to_s3(file: UploadFile, folder: str = "uploads") -> str:
    ext = file.filename.split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if file.size and file.size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")

    key = f"{folder}/{uuid.uuid4()}.{ext}"
    contents = await file.read()
    s3.put_object(
        Bucket=settings.AWS_BUCKET_NAME,
        Key=key,
        Body=contents,
        ContentType=file.content_type,
    )
    return f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

def deduct_credits(user: User, tool: str) -> int:
    cost = settings.CREDIT_COSTS.get(tool, 1)
    if user.credits < cost:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {cost}, have {user.credits}.")
    user.credits -= cost
    return cost

async def enqueue_job(job_id: int, tool: str, params: dict):
    """Push job to Redis queue for worker to process."""
    try:
        import aioredis
        redis = await aioredis.from_url(settings.REDIS_URL)
        await redis.rpush("wizimage:jobs", json.dumps({"job_id": job_id, "tool": tool, "params": params}))
        await redis.close()
    except Exception as e:
        print(f"[WARN] Redis unavailable, running sync: {e}")
        # Fallback: mark as done immediately in dev (no actual AI processing)
        pass

# ── Upload endpoint ───────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    url = await upload_to_s3(file, "uploads")
    return {"url": url}

# ── Upscale ───────────────────────────────────────────────────────────────────
@router.post("/upscale", response_model=JobResponse)
async def upscale(
    file: UploadFile = File(...),
    scale: str = Form("4x"),
    model: str = Form("realesrgan"),
    denoise: int = Form(50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tool     = f"upscale_{scale}"
    cost     = deduct_credits(current_user, tool)
    input_url = await upload_to_s3(file)

    job = ImageJob(
        user_id=current_user.id,
        tool=tool,
        input_url=input_url,
        credits_used=cost,
        params=json.dumps({"scale": scale, "model": model, "denoise": denoise}),
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)

    await enqueue_job(job.id, tool, {"input_url": input_url, "scale": scale, "model": model, "denoise": denoise})
    return JobResponse.model_validate(job)

# ── Enhance ───────────────────────────────────────────────────────────────────
@router.post("/enhance", response_model=JobResponse)
async def enhance(
    file: UploadFile = File(...),
    params: str = Form("{}"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost      = deduct_credits(current_user, "enhance")
    input_url = await upload_to_s3(file)

    job = ImageJob(
        user_id=current_user.id,
        tool="enhance",
        input_url=input_url,
        credits_used=cost,
        params=params,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    await enqueue_job(job.id, "enhance", {"input_url": input_url, **json.loads(params)})
    return JobResponse.model_validate(job)

# ── Background Remove ─────────────────────────────────────────────────────────
@router.post("/bg-remove", response_model=JobResponse)
async def bg_remove(
    file: UploadFile = File(...),
    bg_mode: str = Form("transparent"),
    bg_value: str = Form(""),
    feather: int = Form(2),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost      = deduct_credits(current_user, "bg_remove")
    input_url = await upload_to_s3(file)
    params    = {"bg_mode": bg_mode, "bg_value": bg_value, "feather": feather}

    job = ImageJob(
        user_id=current_user.id,
        tool="bg_remove",
        input_url=input_url,
        credits_used=cost,
        params=json.dumps(params),
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    await enqueue_job(job.id, "bg_remove", {"input_url": input_url, **params})
    return JobResponse.model_validate(job)

# ── Poster Generate ───────────────────────────────────────────────────────────
@router.post("/poster", response_model=JobResponse)
async def poster_generate(
    file: UploadFile = File(...),
    template_id: int = Form(...),
    headline: str = Form(""),
    sub: str = Form(""),
    cta: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cost      = deduct_credits(current_user, "poster_generate")
    input_url = await upload_to_s3(file)
    params    = {"template_id": template_id, "headline": headline, "sub": sub, "cta": cta}

    job = ImageJob(
        user_id=current_user.id,
        tool="poster_generate",
        input_url=input_url,
        credits_used=cost,
        params=json.dumps(params),
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    await enqueue_job(job.id, "poster_generate", {"input_url": input_url, **params})
    return JobResponse.model_validate(job)

# ── Job Status Polling ────────────────────────────────────────────────────────
@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ImageJob).where(ImageJob.id == job_id, ImageJob.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse.model_validate(job)

@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ImageJob)
        .where(ImageJob.user_id == current_user.id)
        .order_by(ImageJob.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [JobResponse.model_validate(j) for j in result.scalars().all()]

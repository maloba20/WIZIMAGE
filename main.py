from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from database import engine, Base
from routers import auth, users, payments, images
from middleware.rate_limit import rate_limit_middleware
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[WizImage API] Database tables ready.")
    yield
    await engine.dispose()


app = FastAPI(
    title="WizImage API",
    version="1.0.0",
    description="AI-powered image processing SaaS — auth, credits, Stripe payments",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def _rate_limit(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.include_router(auth.router,     prefix="/api/auth",     tags=["Authentication"])
app.include_router(users.router,    prefix="/api/users",    tags=["Users"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments / Stripe"])
app.include_router(images.router,   prefix="/api/images",   tags=["Image Processing"])

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

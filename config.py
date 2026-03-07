from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "WizImage"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wizimage"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Stripe
    STRIPE_SECRET_KEY: str = "sk_test_YOUR_KEY_HERE"
    STRIPE_WEBHOOK_SECRET: str = "whsec_YOUR_WEBHOOK_SECRET"
    STRIPE_PRO_PRICE_ID: str = "price_YOUR_PRO_PRICE_ID"
    STRIPE_BUSINESS_PRICE_ID: str = "price_YOUR_BUSINESS_PRICE_ID"

    # Storage (AWS S3 or Cloudflare R2)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "wizimage-uploads"
    AWS_REGION: str = "us-east-1"

    # Email (SendGrid or Resend)
    EMAIL_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@wizimage.com"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://wizimage.app",
    ]

    # Credits
    FREE_TIER_CREDITS: int = 25
    CREDIT_COSTS: dict = {
        "upscale_4x": 2,
        "upscale_8x": 4,
        "bg_remove": 2,
        "enhance": 1,
        "poster_generate": 3,
        "face_restore": 2,
    }

    class Config:
        env_file = ".env"

settings = Settings()

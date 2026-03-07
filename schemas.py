from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from models import PlanEnum, JobStatusEnum

# ── Auth ──────────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# ── User ──────────────────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    plan: PlanEnum
    credits: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

# ── Payments ──────────────────────────────────────────────────────────────────
class CheckoutSessionRequest(BaseModel):
    product_type: str   # "credits_25" | "credits_100" | "credits_300" | "credits_1000"
                        # "subscription_pro" | "subscription_business"
                        # "single_upscale_4x" | "single_bg_remove" | etc.
    success_url: str
    cancel_url: str

class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str

class PortalSessionResponse(BaseModel):
    portal_url: str

# ── Images ────────────────────────────────────────────────────────────────────
class UpscaleRequest(BaseModel):
    scale: str = "4x"           # "2x" | "4x" | "8x"
    model: str = "realesrgan"   # "realesrgan" | "swinir"
    denoise: int = 50

class EnhanceRequest(BaseModel):
    brightness: int = 50
    contrast: int = 50
    sharpness: int = 50
    saturation: int = 50
    clarity: int = 30
    denoise: int = 40
    hdr: int = 20
    warmth: int = 50
    auto: bool = False

class BgRemoveRequest(BaseModel):
    bg_mode: str = "transparent"    # "transparent" | "color" | "gradient"
    bg_value: Optional[str] = None  # hex color or gradient CSS
    feather: int = 2

class PosterRequest(BaseModel):
    template_id: int
    headline: str = ""
    sub: str = ""
    cta: str = ""

class JobResponse(BaseModel):
    id: int
    tool: str
    status: JobStatusEnum
    input_url: str
    output_url: Optional[str]
    credits_used: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class UsageStats(BaseModel):
    total_jobs: int
    credits_used: int
    credits_remaining: int
    jobs_by_tool: dict

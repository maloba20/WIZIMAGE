from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User
from schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse, PasswordResetRequest, PasswordResetConfirm
from services.auth_service import hash_password, verify_password, create_access_token, get_current_user, decode_token
from services.email_service import send_welcome_email, send_password_reset_email
from config import settings

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, summary="Create a new account")
async def signup(
    body: SignupRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        credits=settings.FREE_TIER_CREDITS,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    background_tasks.add_task(send_welcome_email, user.email, user.name)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse, summary="Sign in")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled.")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse, summary="Get current user")
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/password-reset", summary="Request a password reset link")
async def request_password_reset(
    body: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        reset_token = create_access_token({"sub": str(user.id), "type": "reset"})
        background_tasks.add_task(send_password_reset_email, user.email, reset_token)

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/password-reset/confirm", summary="Set a new password")
async def confirm_password_reset(
    body: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_token(body.token)
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token.")
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user.hashed_password = hash_password(body.new_password)
    await db.flush()
    return {"message": "Password updated successfully."}


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully."}

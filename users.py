from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from database import get_db
from models import User, ImageJob, Transaction
from schemas import UserResponse, UserUpdate, UsageStats
from services.auth_service import get_current_user, hash_password

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name:
        current_user.name = body.name
    if body.email:
        # Check uniqueness
        existing = await db.execute(
            select(User).where(User.email == body.email, User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = body.email

    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.get("/me/usage", response_model=UsageStats)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total jobs
    total_q = await db.execute(
        select(func.count()).where(ImageJob.user_id == current_user.id)
    )
    total_jobs = total_q.scalar() or 0

    # Credits used
    credits_used_q = await db.execute(
        select(func.sum(ImageJob.credits_used)).where(ImageJob.user_id == current_user.id)
    )
    credits_used = credits_used_q.scalar() or 0

    # Jobs by tool
    tool_q = await db.execute(
        select(ImageJob.tool, func.count())
        .where(ImageJob.user_id == current_user.id)
        .group_by(ImageJob.tool)
    )
    jobs_by_tool = dict(tool_q.all())

    return UsageStats(
        total_jobs=total_jobs,
        credits_used=credits_used,
        credits_remaining=current_user.credits,
        jobs_by_tool=jobs_by_tool,
    )

@router.get("/me/history")
async def get_history(
    page: int = 1,
    limit: int = 20,
    tool: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(ImageJob).where(ImageJob.user_id == current_user.id)
    if tool:
        q = q.where(ImageJob.tool == tool)
    q = q.order_by(ImageJob.created_at.desc()).offset((page - 1) * limit).limit(limit)

    result = await db.execute(q)
    jobs = result.scalars().all()
    return {"jobs": [j.__dict__ for j in jobs], "page": page, "limit": limit}

@router.get("/me/transactions")
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    txns = result.scalars().all()
    return [t.__dict__ for t in txns]

@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_active = False
    await db.flush()
    return {"message": "Account deactivated"}

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
import enum

class PlanEnum(str, enum.Enum):
    free     = "free"
    pro      = "pro"
    business = "business"

class JobStatusEnum(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    done       = "done"
    failed     = "failed"

class User(Base):
    __tablename__ = "users"

    id:              Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    email:           Mapped[str]          = mapped_column(String(255), unique=True, index=True, nullable=False)
    name:            Mapped[str]          = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str]          = mapped_column(String(255), nullable=False)
    is_verified:     Mapped[bool]         = mapped_column(Boolean, default=False)
    is_active:       Mapped[bool]         = mapped_column(Boolean, default=True)
    plan:            Mapped[PlanEnum]     = mapped_column(SAEnum(PlanEnum), default=PlanEnum.free)
    credits:         Mapped[int]          = mapped_column(Integer, default=25)
    stripe_customer_id:    Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at:      Mapped[DateTime]     = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:      Mapped[DateTime]     = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    images:      "list[ImageJob]"    = relationship("ImageJob", back_populates="user", cascade="all, delete-orphan")
    transactions: "list[Transaction]" = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

class ImageJob(Base):
    __tablename__ = "image_jobs"

    id:           Mapped[int]            = mapped_column(Integer, primary_key=True, index=True)
    user_id:      Mapped[int]            = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    tool:         Mapped[str]            = mapped_column(String(50), nullable=False)
    status:       Mapped[JobStatusEnum]  = mapped_column(SAEnum(JobStatusEnum), default=JobStatusEnum.pending)
    input_url:    Mapped[str]            = mapped_column(Text, nullable=False)
    output_url:   Mapped[str | None]     = mapped_column(Text, nullable=True)
    credits_used: Mapped[int]            = mapped_column(Integer, default=0)
    params:       Mapped[str | None]     = mapped_column(Text, nullable=True)   # JSON string
    error:        Mapped[str | None]     = mapped_column(Text, nullable=True)
    created_at:   Mapped[DateTime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[DateTime | None]= mapped_column(DateTime(timezone=True), nullable=True)

    user: "User" = relationship("User", back_populates="images")

class Transaction(Base):
    __tablename__ = "transactions"

    id:               Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    user_id:          Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_payment_id: Mapped[str]     = mapped_column(String(255), nullable=False)
    amount:           Mapped[float]    = mapped_column(Float, nullable=False)   # USD
    credits_added:    Mapped[int]      = mapped_column(Integer, default=0)
    description:      Mapped[str]      = mapped_column(String(500), nullable=False)
    created_at:       Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: "User" = relationship("User", back_populates="transactions")

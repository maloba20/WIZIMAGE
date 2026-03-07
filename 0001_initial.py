"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id",                    sa.Integer(),     primary_key=True),
        sa.Column("email",                 sa.String(255),   nullable=False, unique=True, index=True),
        sa.Column("name",                  sa.String(255),   nullable=False),
        sa.Column("hashed_password",       sa.String(255),   nullable=False),
        sa.Column("is_verified",           sa.Boolean(),     default=False),
        sa.Column("is_active",             sa.Boolean(),     default=True),
        sa.Column("plan",                  sa.String(20),    default="free"),
        sa.Column("credits",               sa.Integer(),     default=25),
        sa.Column("stripe_customer_id",    sa.String(255),   nullable=True),
        sa.Column("stripe_subscription_id",sa.String(255),   nullable=True),
        sa.Column("created_at",            sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",            sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "image_jobs",
        sa.Column("id",           sa.Integer(),     primary_key=True),
        sa.Column("user_id",      sa.Integer(),     sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool",         sa.String(50),    nullable=False),
        sa.Column("status",       sa.String(20),    default="pending"),
        sa.Column("input_url",    sa.Text(),        nullable=False),
        sa.Column("output_url",   sa.Text(),        nullable=True),
        sa.Column("credits_used", sa.Integer(),     default=0),
        sa.Column("params",       sa.Text(),        nullable=True),
        sa.Column("error",        sa.Text(),        nullable=True),
        sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_image_jobs_user_id", "image_jobs", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id",                sa.Integer(), primary_key=True),
        sa.Column("user_id",           sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_payment_id", sa.String(255), nullable=False),
        sa.Column("amount",            sa.Float(),   nullable=False),
        sa.Column("credits_added",     sa.Integer(), default=0),
        sa.Column("description",       sa.String(500), nullable=False),
        sa.Column("created_at",        sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])


def downgrade():
    op.drop_table("transactions")
    op.drop_table("image_jobs")
    op.drop_table("users")

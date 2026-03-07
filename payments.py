from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import stripe
import json

from database import get_db
from models import User, Transaction
from schemas import CheckoutSessionRequest, CheckoutSessionResponse, PortalSessionResponse
from services.auth_service import get_current_user
from services.email_service import send_credits_added_email
from config import settings

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

# ── Credit pack prices (create these in your Stripe dashboard) ────────────────
CREDIT_PACKS = {
    "credits_25":   {"price": 299,  "credits": 25,   "name": "25 Credits"},
    "credits_100":  {"price": 899,  "credits": 100,  "name": "100 Credits"},
    "credits_300":  {"price": 1999, "credits": 300,  "name": "300 Credits"},
    "credits_1000": {"price": 4999, "credits": 1000, "name": "1000 Credits"},
}

# ── Single-action prices (one-time) ──────────────────────────────────────────
SINGLE_ACTIONS = {
    "single_upscale_4x":  {"price": 100, "credits": 2,  "name": "4× Upscale"},
    "single_upscale_8x":  {"price": 199, "credits": 4,  "name": "8× Upscale"},
    "single_bg_remove":   {"price": 100, "credits": 2,  "name": "Background Removal"},
    "single_enhance":     {"price": 50,  "credits": 1,  "name": "AI Enhance"},
    "single_poster":      {"price": 149, "credits": 3,  "name": "Poster Generation"},
    "single_face_restore":{"price": 100, "credits": 2,  "name": "Face Restoration"},
}

@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    body: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure Stripe customer exists
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.name,
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        await db.flush()

    product = body.product_type

    # ── Subscription ──────────────────────────────────────────────────────────
    if product.startswith("subscription_"):
        price_id = (
            settings.STRIPE_PRO_PRICE_ID
            if product == "subscription_pro"
            else settings.STRIPE_BUSINESS_PRICE_ID
        )
        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=body.cancel_url,
            metadata={"user_id": str(current_user.id), "product": product},
            allow_promotion_codes=True,
        )
        return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)

    # ── Credit packs & single actions (one-time payment) ─────────────────────
    pack = {**CREDIT_PACKS, **SINGLE_ACTIONS}.get(product)
    if not pack:
        raise HTTPException(status_code=400, detail="Unknown product type")

    session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": pack["price"],
                "product_data": {"name": f"WizImage — {pack['name']}"},
            },
            "quantity": 1,
        }],
        success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=body.cancel_url,
        metadata={
            "user_id": str(current_user.id),
            "product": product,
            "credits": str(pack["credits"]),
        },
    )
    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)

@router.post("/portal", response_model=PortalSessionResponse)
async def customer_portal(
    current_user: User = Depends(get_current_user),
):
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url="https://wizimage.app/billing",
    )
    return PortalSessionResponse(portal_url=session.url)

@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload   = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # ── Handle payment success ─────────────────────────────────────────────────
    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        metadata = session.get("metadata", {})
        user_id  = int(metadata.get("user_id", 0))
        product  = metadata.get("product", "")
        credits  = int(metadata.get("credits", 0))

        result = await db.execute(select(User).where(User.id == user_id))
        user   = result.scalar_one_or_none()
        if not user:
            return {"received": True}

        if credits > 0:
            user.credits += credits
            amount_usd = session["amount_total"] / 100
            txn = Transaction(
                user_id=user.id,
                stripe_payment_id=session["payment_intent"] or session["id"],
                amount=amount_usd,
                credits_added=credits,
                description=f"Credit pack: {product}",
            )
            db.add(txn)
            # Fire-and-forget email (don't await — webhook must respond fast)
            import asyncio
            asyncio.create_task(
                send_credits_added_email(user.email, user.name, credits, amount_usd)
            )

    # ── Handle subscription activation / renewal ──────────────────────────────
    elif event["type"] in ("customer.subscription.created", "customer.subscription.updated"):
        sub      = event["data"]["object"]
        customer = sub["customer"]

        result = await db.execute(select(User).where(User.stripe_customer_id == customer))
        user   = result.scalar_one_or_none()
        if user:
            plan_map = {
                settings.STRIPE_PRO_PRICE_ID:      ("pro",      500),
                settings.STRIPE_BUSINESS_PRICE_ID: ("business", 9999),
            }
            price_id = sub["items"]["data"][0]["price"]["id"]
            plan, monthly_credits = plan_map.get(price_id, ("free", 25))
            user.plan = plan
            user.stripe_subscription_id = sub["id"]
            if sub["status"] == "active":
                user.credits = monthly_credits

    # ── Handle subscription cancellation ─────────────────────────────────────
    elif event["type"] == "customer.subscription.deleted":
        sub    = event["data"]["object"]
        result = await db.execute(select(User).where(User.stripe_customer_id == sub["customer"]))
        user   = result.scalar_one_or_none()
        if user:
            user.plan = "free"
            user.stripe_subscription_id = None

    await db.commit()
    return {"received": True}

@router.get("/products")
async def list_products():
    """Public endpoint — returns all purchasable products."""
    return {
        "credit_packs": [
            {"id": k, "credits": v["credits"], "price_usd": v["price"] / 100}
            for k, v in CREDIT_PACKS.items()
        ],
        "single_actions": [
            {"id": k, "name": v["name"], "credits": v["credits"], "price_usd": v["price"] / 100}
            for k, v in SINGLE_ACTIONS.items()
        ],
        "subscriptions": [
            {"id": "subscription_pro",      "name": "Pro",      "price_usd": 12, "credits": 500},
            {"id": "subscription_business", "name": "Business", "price_usd": 39, "credits": -1},
        ],
    }

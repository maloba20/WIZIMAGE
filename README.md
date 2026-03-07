# WizImage Backend

FastAPI + PostgreSQL + Redis + Stripe backend for the WizImage AI SaaS platform.

---

## Stack

| Layer | Tech |
|-------|------|
| API framework | FastAPI + Uvicorn |
| Database | PostgreSQL 16 (async via asyncpg + SQLAlchemy 2) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt passwords |
| Payments | Stripe Checkout + Billing Portal + Webhooks |
| Queue | Redis → Worker process |
| Storage | AWS S3 (or Cloudflare R2) |
| Email | SendGrid |
| AI models | Real-ESRGAN · rembg · GFPGAN · PIL |

---

## Project Structure

```
wizimage-backend/
├── main.py               # FastAPI app, middleware, router registration
├── config.py             # All env-var settings (Pydantic Settings)
├── database.py           # Async SQLAlchemy engine + session
├── models.py             # ORM models: User, ImageJob, Transaction
├── schemas.py            # Pydantic request/response schemas
├── worker.py             # Redis queue worker (AI processing)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 0001_initial.py
├── routers/
│   ├── auth.py           # POST /signup  POST /login  GET /me  password-reset
│   ├── users.py          # GET /me  PATCH /me  usage stats  history
│   ├── payments.py       # Stripe checkout  portal  webhook
│   └── images.py         # upload  upscale  enhance  bg-remove  poster
├── services/
│   ├── auth_service.py   # JWT helpers, password hashing, current_user dep
│   └── email_service.py  # SendGrid transactional emails
└── middleware/
    └── rate_limit.py     # 60 req/min per IP
```

---

## Quick Start (Docker — recommended)

### 1. Clone & configure

```bash
cp .env.example .env
# Fill in all values — see "Environment Variables" section below
```

### 2. Start everything

```bash
docker compose up --build
```

This starts:
- **api** on `http://localhost:8000`
- **worker** (AI job processor)
- **postgres** on `localhost:5432`
- **redis** on `localhost:6379`

### 3. Run migrations

```bash
docker compose exec api alembic upgrade head
```

### 4. Open the API docs

```
http://localhost:8000/api/docs
```

---

## Manual Setup (no Docker)

### Prerequisites

- Python 3.12+
- PostgreSQL 16 running locally
- Redis running locally

### Install

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE wizimage;"

# Run migrations
alembic upgrade head
```

### Start API server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start AI worker (separate terminal)

```bash
python worker.py
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in:

```env
# Generate with: openssl rand -hex 32
SECRET_KEY=your-secret-key-here

# Your PostgreSQL connection
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wizimage

# Redis
REDIS_URL=redis://localhost:6379

# Stripe — https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Create two recurring prices in Stripe Dashboard (monthly)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# AWS S3 (or Cloudflare R2 — same API)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=wizimage-uploads
AWS_REGION=us-east-1

# SendGrid
EMAIL_API_KEY=SG....
EMAIL_FROM=noreply@wizimage.com
```

---

## Stripe Setup (step by step)

### 1. Create your account
Go to https://dashboard.stripe.com and create a free account.

### 2. Get API keys
Dashboard → Developers → API keys → copy `sk_test_...` and `pk_test_...`

### 3. Create subscription prices
Dashboard → Products → Add product:
- **WizImage Pro** → $12.00/month → copy Price ID → `STRIPE_PRO_PRICE_ID`
- **WizImage Business** → $39.00/month → copy Price ID → `STRIPE_BUSINESS_PRICE_ID`

### 4. Set up webhook (local dev)

Install Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to localhost:8000/api/payments/webhook
# Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET
```

### 5. Set up webhook (production)
Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://yourdomain.com/api/payments/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

---

## API Reference

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user, get JWT |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user (requires Bearer token) |
| POST | `/api/auth/password-reset` | Request reset email |
| POST | `/api/auth/password-reset/confirm` | Set new password |

**Auth header:** `Authorization: Bearer <token>`

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Profile + credits + plan |
| PATCH | `/api/users/me` | Update name/email |
| GET | `/api/users/me/usage` | Usage stats |
| GET | `/api/users/me/history` | Job history (paginated) |
| GET | `/api/users/me/transactions` | Payment history |

### Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/checkout` | Create Stripe Checkout session |
| POST | `/api/payments/portal` | Open Stripe Billing Portal |
| POST | `/api/payments/webhook` | Stripe webhook receiver |
| GET | `/api/payments/products` | List all products & prices |

**Checkout product types:**
```
credits_25 / credits_100 / credits_300 / credits_1000
subscription_pro / subscription_business
single_upscale_4x / single_upscale_8x / single_bg_remove
single_enhance / single_poster / single_face_restore
```

### Image Processing

| Method | Path | Cost |
|--------|------|------|
| POST | `/api/images/upload` | Free |
| POST | `/api/images/upscale` | 2–4 cr |
| POST | `/api/images/enhance` | 1 cr |
| POST | `/api/images/bg-remove` | 2 cr |
| POST | `/api/images/poster` | 3 cr |
| GET | `/api/images/jobs/{id}` | Free — poll status |
| GET | `/api/images/jobs` | Free — list history |

All image endpoints accept `multipart/form-data` with a `file` field.

---

## Connecting the Frontend

In `WizImage.jsx` set:

```js
const API_URL    = "http://localhost:8000/api";  // dev
const APP_URL    = "http://localhost:3000";
const STRIPE_KEY = "pk_test_...";               // Stripe publishable key
```

For production:
```js
const API_URL = "https://api.wizimage.app/api";
const APP_URL = "https://wizimage.app";
```

---

## Deployment (Production)

Recommended: **Railway** or **Render** (zero-config Docker deploys)

### Railway (easiest)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Add PostgreSQL + Redis plugins in the Railway dashboard. Set all env vars.

### Render
1. Create new "Web Service" → connect GitHub repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add PostgreSQL + Redis services
5. Set env vars in dashboard

### AWS / GCP / DigitalOcean
Use the provided `Dockerfile` + `docker-compose.yml`.

---

## Credit System

| Action | Credits |
|--------|---------|
| 2× Upscale | 1 |
| 4× Upscale | 2 |
| 8× Upscale | 4 |
| Background Remove | 2 |
| AI Enhance (auto) | 1 |
| Poster Generate | 3 |
| Face Restore | 2 |

Plans reset credits monthly via Stripe subscription webhooks.

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire in 7 days (configurable)
- Rate limiting: 60 requests/min per IP
- Stripe webhook signature verification on every event
- S3 bucket should be private — serve via signed URLs in production
- All endpoints require `Authorization: Bearer <token>` except `/health`, `/api/auth/signup`, `/api/auth/login`, `/api/payments/products`

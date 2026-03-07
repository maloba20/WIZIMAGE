"""
Email service — works with SendGrid (default) or Resend.
Set EMAIL_PROVIDER=resend in .env to switch.
"""
import httpx
from config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {settings.EMAIL_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to}]}],
                    "from": {"email": settings.EMAIL_FROM, "name": "WizImage"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html}],
                },
                timeout=10,
            )
        return res.status_code == 202
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to}: {e}")
        return False


def _base(content: str) -> str:
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#121212;color:#fff;border-radius:16px;overflow:hidden">
      <div style="background:#1db954;padding:28px 36px">
        <span style="font-size:22px;font-weight:800;letter-spacing:-.03em;color:#000">✦ WizImage</span>
      </div>
      <div style="padding:36px">{content}</div>
      <div style="padding:20px 36px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:rgba(255,255,255,.4)">
        © 2026 WizImage · <a href="https://wizimage.app/unsubscribe" style="color:#1db954">Unsubscribe</a>
      </div>
    </div>
    """


async def send_welcome_email(to: str, name: str) -> bool:
    html = _base(f"""
        <h2 style="font-size:24px;font-weight:800;margin-bottom:12px">Welcome, {name}! 🎉</h2>
        <p style="color:rgba(255,255,255,.7);margin-bottom:20px">
          You have <strong style="color:#1db954">25 free credits</strong> ready to use.
          Try upscaling your first image — it takes less than 3 seconds.
        </p>
        <a href="https://wizimage.app/upscale"
           style="display:inline-block;background:#1db954;color:#000;font-weight:700;
                  padding:12px 28px;border-radius:99px;text-decoration:none;font-size:15px">
          Start creating →
        </a>
    """)
    return await send_email(to, "Welcome to WizImage 🎉", html)


async def send_password_reset_email(to: str, reset_token: str) -> bool:
    link = f"https://wizimage.app/reset-password?token={reset_token}"
    html = _base(f"""
        <h2 style="font-size:22px;font-weight:800;margin-bottom:12px">Reset your password</h2>
        <p style="color:rgba(255,255,255,.7);margin-bottom:24px">
          Click the button below to reset your password. This link expires in 1 hour.
        </p>
        <a href="{link}"
           style="display:inline-block;background:#1db954;color:#000;font-weight:700;
                  padding:12px 28px;border-radius:99px;text-decoration:none;font-size:15px">
          Reset password →
        </a>
        <p style="color:rgba(255,255,255,.4);font-size:12px;margin-top:24px">
          If you didn't request this, ignore this email.
        </p>
    """)
    return await send_email(to, "Reset your WizImage password", html)


async def send_credits_added_email(to: str, name: str, credits: int, amount_usd: float) -> bool:
    html = _base(f"""
        <h2 style="font-size:22px;font-weight:800;margin-bottom:12px">
          {credits} credits added ✦
        </h2>
        <p style="color:rgba(255,255,255,.7);margin-bottom:8px">
          Hi {name}, your payment of <strong style="color:#fff">${amount_usd:.2f}</strong> was successful.
        </p>
        <p style="color:rgba(255,255,255,.7);margin-bottom:24px">
          <strong style="color:#1db954;font-size:32px;font-weight:800">{credits}</strong> credits have been added to your account.
        </p>
        <a href="https://wizimage.app/dashboard"
           style="display:inline-block;background:#1db954;color:#000;font-weight:700;
                  padding:12px 28px;border-radius:99px;text-decoration:none;font-size:15px">
          Start creating →
        </a>
    """)
    return await send_email(to, f"{credits} credits added to your WizImage account", html)

"""
Simple in-memory rate limiter middleware.
For production swap with a Redis-backed solution (slowapi + redis).
"""
from fastapi import Request, HTTPException
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio

class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests  = max_requests
        self.window        = window_seconds
        self._store: dict  = defaultdict(list)
        self._lock         = asyncio.Lock()

    async def is_allowed(self, key: str) -> bool:
        async with self._lock:
            now    = datetime.utcnow()
            cutoff = now - timedelta(seconds=self.window)
            self._store[key] = [t for t in self._store[key] if t > cutoff]
            if len(self._store[key]) >= self.max_requests:
                return False
            self._store[key].append(now)
            return True

_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    allowed   = await _limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    return await call_next(request)

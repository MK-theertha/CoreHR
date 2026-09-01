"""Redis-backed rate limiting as plain ASGI middleware.

Originally used slowapi's per-route `@limiter.limit(...)` decorator, but that
mechanism silently never fires on the FastAPI/Starlette versions pinned here
(FastAPI resolves included routers lazily via `_IncludedRouter`, and
slowapi's decorator-based check never gets invoked as a result — verified by
tracing `Limiter._check_request_limit`, which is simply never called). ASGI
middleware runs on every request regardless of how routes are resolved
internally, so it isn't affected by that. Talking to `limits` directly here
also drops slowapi as a dependency entirely, since its only useful feature
on this stack (route decorators) doesn't work.
"""

from limits import RateLimitItem, parse
from limits.storage import storage_from_string
from limits.strategies import FixedWindowRateLimiter
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings

_storage = storage_from_string(settings.redis_url)
_strategy = FixedWindowRateLimiter(_storage)

DEFAULT_LIMIT: RateLimitItem = parse("300/15minutes")
AUTH_LIMIT: RateLimitItem = parse("10/15minutes")

# Paths that get the stricter, per-path (not just per-IP) limit — brute-force
# / credential-stuffing targets.
AUTH_PATHS = {"/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh"}


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        is_auth_path = path in AUTH_PATHS
        limit_item = AUTH_LIMIT if is_auth_path else DEFAULT_LIMIT
        # Auth paths are keyed per-path-per-IP so a slow /login attacker
        # can't burn through the budget other auth endpoints need.
        key = f"{path}:{client_ip}" if is_auth_path else client_ip

        try:
            allowed = _strategy.hit(limit_item, key)
        except Exception:
            # Redis unreachable: fail open. Losing rate limiting for a few
            # minutes beats taking the whole API down over it.
            allowed = True

        if not allowed:
            response = JSONResponse(
                {"success": False, "message": "Too many requests, please try again later."},
                status_code=429,
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)

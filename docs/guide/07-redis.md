[← Back to Documentation index](./README.md) · [← API Reference](./06-api-reference.md)

# Redis Usage

Three independent uses, all fail open (Redis being down degrades gracefully
instead of breaking the app):

## 1. Dashboard summary cache (cache-aside)

`app/services/dashboard_service.py`:
- `GET /dashboard/summary` is cached for **60 seconds**.
- Org-wide summary shares **one** key (`dashboard:summary:org`) across every
  SUPER_ADMIN/HR_ADMIN/MANAGER viewer, since the result is identical for all of
  them.
- Personal summary is keyed per user (`dashboard:summary:user:<id>`).
- On cache miss: compute from Postgres, write to Redis with a 60s TTL, return.
- On any `RedisError` (read or write): log a warning and fall straight through to
  Postgres — the endpoint never breaks because Redis is unavailable.
- **Invalidation** (explicit `DELETE`, not just TTL expiry) fires from every
  mutation that could change the cached numbers:
  - `employees_service`: create/update/delete → invalidate org.
  - `departments_service`: create/update/delete → invalidate org.
  - `leave_service`: create/decide/cancel → invalidate org **and** the affected
    employee's personal cache (their pending/approved counts and, on a decision,
    their notification count both changed).
  - `notification_service`: mark-read / mark-all-read → invalidate that user's
    personal cache.

## 2. Rate limiting (custom ASGI middleware)

`app/core/rate_limit.py` — **not** using the `slowapi` package's per-route
decorator (see the big comment at the top of that file: that mechanism was found
to silently never fire on the FastAPI/Starlette versions pinned here — traced all
the way to confirming `Limiter._check_request_limit` was simply never invoked, so
the original code *looked* rate-limited but wasn't). Instead it's a plain
`RateLimitMiddleware` ASGI class using the `limits` library directly against
Redis (`FixedWindowRateLimiter` + `storage_from_string(settings.redis_url)`):

- **Default**: 300 requests / 15 minutes, keyed by client IP.
- **Auth paths** (`/auth/register`, `/auth/login`, `/auth/refresh`): 10 requests /
  15 minutes, keyed by `<path>:<IP>` (so hammering `/login` can't burn the shared
  budget other auth endpoints need, and vice versa).
- Redis-backed (not in-memory) specifically because the app runs multiple gunicorn
  worker processes — and in production, multiple EC2 instances behind the ALB — so
  an in-memory counter per-process would let every worker/instance grant its own
  separate quota.
- Registered in `app/main.py` **before** `CORSMiddleware` — Starlette runs the
  most-recently-added middleware first, so this ordering puts CORS outermost,
  ensuring a `429` response still carries CORS headers (otherwise browsers report
  a confusing CORS failure instead of surfacing the real rate-limit error).
- On any Redis error, the middleware fails open (`allowed = True`) rather than
  taking the API down.

## 3. Refresh-token revocation (token versioning)

`app/services/auth_service.py` — a single integer per user,
`token_version:<userId>`, incremented on logout; every refresh token carries the
version it was issued under and gets rejected on `/refresh` if that version is
stale. Full writeup, including the fail-open sentinel behavior, in
[Authentication](./03-authentication.md) since it's really an auth feature that
happens to be Redis-backed, not the other way around.

`REDIS_URL` (local default `redis://localhost:6380/0`, matching Docker Compose's
Redis port mapping) is the single connection string for all three uses.

---

[← API Reference](./06-api-reference.md) · Next: [File Storage & Email →](./08-file-storage-and-email.md)

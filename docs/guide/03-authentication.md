[← Back to Documentation index](./README.md) · [← Data Model](./02-data-model.md)

# Authentication

JWT-based, stateless, no server-side session store. Two token types:

- **Access token** — short-lived (`JWT_ACCESS_TTL`, default `15m`). Sent as
  `Authorization: Bearer <token>` on every authenticated request. Payload:
  `{sub, email, role, organizationId, exp}`.
- **Refresh token** — longer-lived (`JWT_REFRESH_TTL`, default `7d`). Payload:
  `{sub, type: "refresh", ver, exp}` (`ver` — see **revocation** below). In the
  Node backend it's carried in an `httpOnly` cookie (`refreshToken`, path
  `/api/v1/auth`, `secure` in production, `SameSite=Lax`); the FastAPI backend
  implements the identical cookie contract
  (`fastapi-backend/app/api/v1/auth.py::_set_refresh_cookie`).

Passwords are hashed with **bcrypt**, 10 rounds
(`fastapi-backend/app/core/security.py::hash_password`).

## Flow

1. `POST /auth/register` or `POST /auth/login` → server signs both tokens, returns
   `{user, accessToken}` in the body and sets the refresh token as an `httpOnly`
   cookie.
2. Every subsequent request carries the access token in the `Authorization` header.
3. On expiry, the frontend calls `POST /auth/refresh` (cookie sent automatically by
   the browser) to get a new access token, without re-prompting for a password.
4. `POST /auth/logout` clears the refresh cookie **and revokes the refresh token
   server-side** (FastAPI backend only — see below). A stolen access token still
   remains valid until it naturally expires (15 min) — that tradeoff is deliberate,
   not an oversight: access tokens are short-lived and stateless by design, and
   checking a Redis revocation list on every single authenticated request (not just
   the rare `/refresh` call) isn't worth the extra round-trip for a 15-minute
   exposure window.

`GET /auth/me` returns the current user, resolved from the access token's `sub`
claim by looking the user up fresh in the DB each time (so a role change or
deactivation is reflected as soon as the *next* access token is issued, not
instantly — access tokens aren't re-validated against the DB on every single
request, only decoded/verified).

## Refresh-token revocation (FastAPI backend, "logout" done right)

The gap: earlier, `/auth/logout` only cleared the cookie client-side — a refresh
token captured before logout (XSS, a synced/stolen device, a debugging proxy left
running) stayed valid for its full remaining 7-day life, logout or not. Fixed via
**token versioning**, a Redis-backed integer per user rather than a blocklist of
individual tokens:

- `app/services/auth_service.py::get_token_version(user_id)` /
  `bump_token_version(user_id)` read/increment a Redis key `token_version:<userId>`
  (default `0` if never set).
- Every refresh token is issued carrying the *current* version as its `ver` claim
  (`_issue_tokens`).
- `POST /auth/logout` reads the `refreshToken` cookie (if present), decodes it
  (ignoring decode failures — a garbage/expired cookie just means nothing to
  revoke), and **increments** that user's version before clearing the cookie.
- `POST /auth/refresh` compares the presented token's `ver` claim against the
  *current* stored version — a mismatch means "issued before the last logout,"
  rejected with `401`, even though the JWT signature itself is still valid.
- Since this app only ever has one refresh cookie per browser (no multi-device
  session list), "logout" and "logout everywhere" are the same operation for free
  — no per-device session tracking needed.
- **Fails open** on a Redis outage, exactly like the other two Redis uses (see
  [Redis Usage](./07-redis.md)): `get_token_version` returns a `-1` sentinel on any
  `RedisError`, and the comparison explicitly skips the check when it sees `-1`
  rather than treating "unknown" as "revoked." A Redis blip degrades to "logout
  doesn't immediately revoke," not "nobody can refresh their session."

## Where this is implemented (FastAPI)

- `app/core/security.py` — `hash_password`/`verify_password` (bcrypt),
  `sign_access_token`/`sign_refresh_token`/`decode_access_token`/
  `decode_refresh_token` (PyJWT, `HS256`), `parse_duration_seconds` (parses
  `"15m"`/`"7d"`-style TTL strings).
- `app/deps.py::get_current_user` — a FastAPI dependency that reads the
  `Authorization` header, decodes+verifies the access token, and returns a
  `CurrentUser` dataclass (`id, email, role, organization_id`). Raises `401` on a
  missing/invalid/expired token.
- `app/services/auth_service.py` — `register`, `login`, `refresh`,
  `get_user_by_id`, `get_token_version`, `bump_token_version`.

**JWT secrets are never hardcoded to a usable value in production.**
`app/core/config.py` has insecure placeholder defaults
(`corehr-access-secret-change-me` / `corehr-refresh-secret-change-me`) purely so
local dev works out of the box, but a `model_validator` on `Settings` **refuses to
start** if `APP_ENV=production` and either secret still equals its placeholder —
you must set real values via environment variables.

---

[← Data Model](./02-data-model.md) · Next: [Authorization (RBAC) →](./04-authorization-rbac.md)

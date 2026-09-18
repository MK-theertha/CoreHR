[← Back to Documentation index](./README.md) · [← Authorization (RBAC)](./04-authorization-rbac.md)

# FastAPI Backend — Architecture

```
Request
  │
  ▼
RateLimitMiddleware (ASGI, Redis-backed)   ── see Redis Usage
  ▼
CORSMiddleware
  ▼
FastAPI router (app/api/v1/*.py)
  │  · path/query/body parsed & validated by Pydantic schemas (app/schemas/*.py)
  │  · Depends(get_current_user) / Depends(require_roles(...)) — auth + RBAC
  ▼
Service layer (app/services/*.py)
  │  · all business logic and SQLAlchemy queries live here, not in routers
  │  · routers stay thin: parse → call one service function → wrap in ok()/ok_paginated()
  ▼
SQLAlchemy async session (app/db/base.py) → asyncpg → PostgreSQL
```

This is the classic **Router → Service → Database** layering the original spec
asked for. A few concrete conventions worth knowing:

- **Response envelope**: every successful response is `{"success": true, "data": ...}`
  (`app/schemas/common.py::ok`), or for paginated lists,
  `{"success": true, "data": [...], "meta": {"total", "page", "pageSize"}}`
  (`ok_paginated`). Errors are `{"success": false, "message": "..."}` with the
  matching HTTP status.
- **Error handling**: `app/core/errors.py` defines `AppError(message, status_code,
  is_operational=True)` — raise it anywhere in a service and FastAPI's exception
  handler turns it into the right HTTP response. `is_operational=False` masks the
  real message behind a generic "Internal server error" (for errors that shouldn't
  leak detail). Unhandled exceptions and Pydantic validation errors also get
  consistent JSON shapes.
- **DB sessions**: `app/db/base.py` creates one process-wide async engine
  (`create_async_engine(settings.asyncpg_database_url)`) and a `get_db()`
  dependency that yields a fresh `AsyncSession` per request, closed automatically
  when the request ends.
- **IDs**: every primary key is a `cuid` (via the `cuid2` package's `cuid_wrapper`,
  `app/core/security.py::new_cuid`) — a URL-safe, collision-resistant string ID,
  matching what Prisma's `@default(cuid())` generates on the Node side, so IDs look
  the same shape across both backends.
- **Timestamps**: stored as naive UTC (`app/core/util.py::to_naive_utc` strips
  timezone info after converting to UTC) — the DB columns are `TIMESTAMP WITHOUT
  TIME ZONE`, matching Prisma's `DateTime` mapping.
- **Audit trail**: `app/services/audit_service.py::record(db, actor, action=...,
  entity_type=..., entity_id=..., metadata=...)` — a synchronous helper (no
  `await`, just `db.add(...)`) called inline by mutating service functions
  *before* their own `db.commit()`, so the audit row is part of the same
  transaction as the change it's recording. `actor` is an `Actor(user_id,
  ip_address)` dataclass built per-request from `CurrentUser` + `request.client.host`.

---

[← Authorization (RBAC)](./04-authorization-rbac.md) · Next: [API Reference →](./06-api-reference.md)

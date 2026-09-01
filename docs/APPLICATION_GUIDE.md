# CoreHR — Complete Application Guide

This is a from-the-ground-up reference for the whole CoreHR system: what it does,
every technology in it, how the repository is laid out, the full data model, every
API endpoint, and how local dev / CI / production deployment work. It assumes no
prior familiarity with the codebase.

> **Read this first — the app currently has two backends.** CoreHR started as a
> Node/Express/Prisma API and is being migrated to Python/FastAPI/SQLAlchemy. Both
> exist in the repo right now:
> - **`backend/`** — the original Node/Express/Prisma API. **This is what the
>   frontend actually talks to today** (`frontend`'s `VITE_API_BASE_URL` points at
>   it, and `docker-compose.yml`'s `frontend` service depends on it).
> - **`fastapi-backend/`** — the new Python/FastAPI/SQLAlchemy API. It reimplements
>   the same data model and (almost) the same API contract, has its own database,
>   runs in Docker Compose alongside the Node backend, has its own CI job, and has
>   a full Terraform module for deploying it to AWS. **The frontend does not call
>   it yet** — no cutover has happened. It's reachable directly (e.g.
>   `http://localhost:8100` locally) for testing, but nothing wires it into the
>   user-facing app yet.
>
> Everything in this guide is written against the **current, real state of the
> code** (not the original design intent) — see [§13 Current State & Known
> Gaps](#13-current-state--known-gaps) for the precise list of what's implemented,
> what's stubbed, and what's still Node-only.

---

## Table of contents

1. [What CoreHR is](#1-what-corehr-is)
2. [Repository layout](#2-repository-layout)
3. [Tech stack](#3-tech-stack)
4. [Data model](#4-data-model)
5. [Authentication](#5-authentication)
6. [Authorization (RBAC)](#6-authorization-rbac)
7. [FastAPI backend — architecture](#7-fastapi-backend--architecture)
8. [FastAPI backend — complete API reference](#8-fastapi-backend--complete-api-reference)
9. [Redis usage](#9-redis-usage)
10. [S3 / file storage](#10-s3--file-storage)
11. [Frontend architecture](#11-frontend-architecture)
12. [Node/Express backend (legacy, still live)](#12-nodeexpress-backend-legacy-still-live)
13. [Current state & known gaps](#13-current-state--known-gaps)
14. [Local development](#14-local-development)
15. [Docker & Docker Compose](#15-docker--docker-compose)
16. [Testing](#16-testing)
17. [CI/CD (GitHub Actions)](#17-cicd-github-actions)
18. [Terraform / AWS production infrastructure](#18-terraform--aws-production-infrastructure)
19. [Environment variables reference](#19-environment-variables-reference)
20. [Glossary](#20-glossary)

---

## 1. What CoreHR is

CoreHR is a workforce-management web app for a single organization (the schema
supports more than one, but only one is ever seeded/used today). It covers:

- **Employee directory** — HR records with contact info, job title, department,
  employment status, and (new) a profile image.
- **Departments** — a flat list, each employee belongs to at most one.
- **Leave management** — employees request leave; managers/HR/admins approve or
  reject it; requesters can cancel their own pending requests. Approving/rejecting
  fires a notification to the requester.
- **Notifications** — an in-app inbox, currently only ever populated by leave
  decisions.
- **Role-aware dashboard** — org-wide counts (headcount, departments, leave
  pipeline) for admins/managers, personal counts (own pending/approved leave,
  unread notifications) for regular employees.
- **Reports** — one endpoint that returns several breakdowns (by department, by
  employment status, by leave status, by user role) — SUPER_ADMIN only.
- **Audit log** — every employee create/update/delete, leave request/approve/
  reject/cancel, and role change is recorded with actor, IP, and a metadata blob;
  viewable (SUPER_ADMIN/HR_ADMIN) via `GET /api/v1/audit`.
- **User/role administration** — SUPER_ADMIN can change any user's role.
- **Organization settings** — SUPER_ADMIN can view/rename the (single) organization.

Four roles, strictly enforced server-side (see [§6](#6-authorization-rbac)):
`SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`.

---

## 2. Repository layout

```
CoreHR/
├── backend/                    # Node/Express/Prisma API — what the frontend uses today
│   ├── prisma/schema.prisma    #   Prisma schema (source of truth for the Node side)
│   └── src/
│       ├── config/             #   env loading, Prisma client, swagger
│       ├── controllers/        #   one per domain
│       ├── services/           #   Prisma queries + business logic
│       ├── routes/              #   Express routers + Zod validation + RBAC
│       └── middleware/          #   protect (JWT), authorize (roles), validate, errorHandler
│
├── fastapi-backend/            # Python/FastAPI/SQLAlchemy API — the migration target
│   ├── app/
│   │   ├── main.py             #   FastAPI app: middleware, router mount, /health
│   │   ├── core/                #   config, security (JWT/bcrypt), errors, rate_limit, redis, s3, util
│   │   ├── db/                  #   base.py (engine/session), models.py (SQLAlchemy models)
│   │   ├── deps.py              #   get_db, get_current_user, require_roles, CurrentUser
│   │   ├── schemas/             #   Pydantic request models, one file per domain
│   │   ├── api/v1/               #   FastAPI routers, one file per domain
│   │   └── services/             #   business logic + DB queries, one file per domain
│   ├── alembic/                 #   migrations (env.py wired to app.core.config.settings)
│   │   └── versions/1117969025a6_initial_schema.py   # the one baseline migration
│   ├── tests/                    #   pytest + pytest-asyncio, hits a real Postgres
│   ├── Dockerfile                #   multi-stage, non-root, gunicorn+uvicorn workers
│   ├── requirements.txt
│   ├── alembic.ini
│   └── pytest.ini
│
├── frontend/                    # React 19 + Vite SPA — talks to backend/ (Node), not fastapi-backend/
│   └── src/
│       ├── pages/, hooks/, lib/api.ts, types/, components/   # see §11
│
├── infra/terraform/             # AWS infrastructure-as-code for fastapi-backend (see §18)
│   ├── providers.tf, variables.tf, outputs.tf
│   ├── vpc.tf, security-groups.tf, iam.tf, ecr.tf, ec2.tf, alb.tf, rds.tf, redis.tf, s3.tf, cloudfront.tf
│   ├── templates/user_data.sh.tpl
│   └── terraform.tfvars.example
│
├── scripts/
│   └── postgres-init-multiple-dbs.sh   # creates corehr_fastapi alongside corehr on first Compose boot
│
├── docker-compose.yml            # postgres, redis, backend (Node), fastapi-backend, frontend
├── .github/workflows/ci.yml       # two jobs: test-and-build (Node), fastapi-backend (Python)
├── docs/
│   ├── ARCHITECTURE.md            # original Node-backend architecture doc
│   └── APPLICATION_GUIDE.md       # this file
├── package.json                   # npm workspaces root (frontend + backend only — not fastapi-backend)
└── README.md                      # original top-level README (Node-focused)
```

---

## 3. Tech stack

| Layer | FastAPI backend (new) | Node backend (legacy, live) | Frontend |
|---|---|---|---|
| Language | Python 3.13 | TypeScript | TypeScript |
| Framework | FastAPI 0.141 | Express 5 | React 19 + Vite |
| ORM / DB access | SQLAlchemy 2.x (async, `asyncpg`) | Prisma 7 (`@prisma/adapter-pg`) | — |
| Migrations | Alembic | Prisma Migrate | — |
| Validation | Pydantic v2 | Zod | Zod (via React Hook Form) |
| Auth | PyJWT + bcrypt | jsonwebtoken + bcrypt | — (consumes JWTs) |
| Rate limiting | `limits` + custom ASGI middleware, Redis-backed | (not reviewed in this pass) | — |
| Caching | Redis (`redis` async client) | — | TanStack Query (client-side cache) |
| File storage | boto3 → S3 (pre-signed URLs) | — | — |
| ASGI/WSGI server | gunicorn + `uvicorn.workers.UvicornWorker` | node | — |
| Testing | pytest + pytest-asyncio + httpx | vitest (per root README) | — |
| Routing | — | — | React Router |
| Data fetching / cache | — | — | TanStack Query |
| Forms | — | — | React Hook Form + Zod |
| Styling | — | — | Tailwind CSS |

**Shared infrastructure**: PostgreSQL 16, Redis 7, Docker/Docker Compose, GitHub
Actions. **AWS (FastAPI backend only, via Terraform)**: VPC, ALB, EC2 (Auto Scaling
Group), RDS Postgres, ElastiCache Redis, S3, CloudFront, ECR, IAM (incl. GitHub
OIDC), CloudWatch.

---

## 4. Data model

Both backends implement the **same logical schema** (the FastAPI SQLAlchemy models
in `fastapi-backend/app/db/models.py` were written to mirror
`backend/prisma/schema.prisma` exactly, table-for-table and column-for-column,
including matching Postgres constraint names). Table names are `PascalCase`
(quoted identifiers), columns are `camelCase` in the actual database even though
Python/SQLAlchemy attribute names are `snake_case`.

### Entities

**Organization** — top-level tenant. Every Department/User/Employee optionally
belongs to one. Only one is ever seeded in practice.
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| slug | string | unique |
| createdAt, updatedAt | timestamp | |

**User** — a login identity (not the same row as an Employee).
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| email | string | unique |
| passwordHash | string | bcrypt, 10 rounds |
| role | enum `RoleName` | `SUPER_ADMIN` \| `HR_ADMIN` \| `MANAGER` \| `EMPLOYEE`, default `EMPLOYEE` |
| organizationId | string? | FK → Organization, `ON DELETE SET NULL` |
| createdAt, updatedAt | timestamp | |

**Department**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| organizationId | string | FK → Organization, `ON DELETE RESTRICT` (not nullable) |
| createdAt | timestamp | |

**Employee** — the HR record. Optionally linked 1:1 to a User (for self-service login).
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| fullName | string | |
| email | string | unique |
| phone, gender, jobTitle | string? | |
| dateOfBirth, joiningDate | timestamp? | |
| departmentId | string? | FK → Department, `ON DELETE SET NULL` |
| status | enum `EmploymentStatus` | `ACTIVE` \| `PROBATION` \| `INACTIVE` \| `TERMINATED`, default `ACTIVE` |
| profileImage | string? | **S3 object key** (not a URL — see [§10](#10-s3--file-storage)) |
| organizationId | string? | FK → Organization, `ON DELETE SET NULL` |
| userId | string? | FK → User, unique, `ON DELETE SET NULL` |
| createdAt, updatedAt | timestamp | |

**LeaveRequest**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| employeeId | string | FK → Employee, `ON DELETE RESTRICT` |
| leaveType | string | free text (e.g. "Sick", "Vacation") |
| startDate, endDate | timestamp | |
| reason | string | |
| status | enum `LeaveStatus` | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`, default `PENDING` |
| approvedBy | string? | FK → User, `ON DELETE SET NULL` — who decided it |
| comments | string? | decision comment |
| createdAt, updatedAt | timestamp | |

**Notification**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| title, message, type | string | `type` is currently always `"LEAVE"` in practice |
| isRead | boolean | default `false` |
| userId | string? | FK → User, `ON DELETE SET NULL` — recipient |
| createdAt | timestamp | |

**AuditLog**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| userId | string? | FK → User, `ON DELETE SET NULL` — actor |
| action | string | e.g. `EMPLOYEE_CREATED`, `LEAVE_APPROVED`, `USER_ROLE_CHANGED` |
| entityType, entityId | string? | what was acted on |
| timestamp | timestamp | |
| ipAddress | string? | |
| metadata | JSONB | free-form details (e.g. `{"changes": {...}}`) |

Indexed on `(entityType, entityId)` and `userId`.

### Relationships (at a glance)

```
Organization 1───* User
Organization 1───* Department
Organization 1───* Employee

Department   1───* Employee

User         1───1 Employee        (User.id ← Employee.userId, optional)
User         1───* Notification    (recipient)
User         1───* LeaveRequest    (as approver, via approvedBy)
User         1───* AuditLog        (as actor)

Employee     1───* LeaveRequest
```

A `User` is a login credential; an `Employee` is an HR record. They're linked but
distinct — an Employee can exist with no linked User (not yet invited to
self-service), and (in principle) a User could exist with no Employee (an
admin-only account). Registration (`POST /auth/register`) always creates a `User`
with role `EMPLOYEE`, and either links it to an existing `Employee` row matching
the email or creates a new bare-minimum `Employee` row for it.

### FastAPI's Alembic migration

`fastapi-backend/alembic/versions/1117969025a6_initial_schema.py` is a single,
hand-written baseline migration — not autogenerated — because it was adopted
*after* the FastAPI backend's dev database already existed (bootstrapped by
hand-applying the Node backend's Prisma SQL). It was written to produce **exactly**
the schema above from scratch (enums, tables, FKs with names matching what Postgres
already assigned, indexes), verified by running it against a disposable database
and confirming `alembic check` reports zero drift against the SQLAlchemy models.
The existing local dev database was `alembic stamp head`-ed (marked as already
migrated) rather than replayed, since its schema already matched.

---

## 5. Authentication

JWT-based, stateless, no server-side session store. Two token types:

- **Access token** — short-lived (`JWT_ACCESS_TTL`, default `15m`). Sent as
  `Authorization: Bearer <token>` on every authenticated request. Payload:
  `{sub, email, role, organizationId, exp}`.
- **Refresh token** — longer-lived (`JWT_REFRESH_TTL`, default `7d`). Payload:
  `{sub, type: "refresh", exp}`. In the Node backend it's carried in an `httpOnly`
  cookie (`refreshToken`, path `/api/v1/auth`, `secure` in production,
  `SameSite=Lax`); the FastAPI backend implements the identical cookie contract
  (`fastapi-backend/app/api/v1/auth.py::_set_refresh_cookie`).

Passwords are hashed with **bcrypt**, 10 rounds
(`fastapi-backend/app/core/security.py::hash_password`).

### Flow

1. `POST /auth/register` or `POST /auth/login` → server signs both tokens, returns
   `{user, accessToken}` in the body and sets the refresh token as an `httpOnly`
   cookie.
2. Every subsequent request carries the access token in the `Authorization` header.
3. On expiry, the frontend calls `POST /auth/refresh` (cookie sent automatically by
   the browser) to get a new access token, without re-prompting for a password.
4. `POST /auth/logout` clears the refresh cookie. (There's no server-side token
   revocation/blocklist — logout is purely "the browser stops sending the cookie."
   A stolen access token remains valid until it naturally expires.)

`GET /auth/me` returns the current user, resolved from the access token's `sub`
claim by looking the user up fresh in the DB each time (so a role change or
deactivation is reflected as soon as the *next* access token is issued, not
instantly — access tokens aren't re-validated against the DB on every single
request, only decoded/verified).

### Where this is implemented (FastAPI)

- `app/core/security.py` — `hash_password`/`verify_password` (bcrypt),
  `sign_access_token`/`sign_refresh_token`/`decode_access_token`/
  `decode_refresh_token` (PyJWT, `HS256`), `parse_duration_seconds` (parses
  `"15m"`/`"7d"`-style TTL strings).
- `app/deps.py::get_current_user` — a FastAPI dependency that reads the
  `Authorization` header, decodes+verifies the access token, and returns a
  `CurrentUser` dataclass (`id, email, role, organization_id`). Raises `401` on a
  missing/invalid/expired token.
- `app/services/auth_service.py` — `register`, `login`, `refresh`,
  `get_user_by_id`.

**JWT secrets are never hardcoded to a usable value in production.**
`app/core/config.py` has insecure placeholder defaults
(`corehr-access-secret-change-me` / `corehr-refresh-secret-change-me`) purely so
local dev works out of the box, but a `model_validator` on `Settings` **refuses to
start** if `APP_ENV=production` and either secret still equals its placeholder —
you must set real values via environment variables.

---

## 6. Authorization (RBAC)

Enforced **server-side only** (the frontend does not gate rendering by role in any
way that should be trusted — that's a UX nicety, not a security boundary). Four
roles: `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`.

### Mechanism (FastAPI)

`app/deps.py`:
- `get_current_user` — authentication only (any valid token).
- `require_roles(*roles)` — a dependency factory; returns a dependency that calls
  `get_current_user` and then raises `403 Forbidden: insufficient permissions` if
  the user's role isn't in the allowed set.

Every router either depends on `get_current_user` (any authenticated user) at the
router level, and/or attaches `Depends(require_roles(...))` to specific routes for
stricter checks. `POST /api/v1/leave/{id}/cancel` for example only requires
authentication — the *ownership* check ("is this your own pending request?")
happens inside `leave_service.cancel`, not via a role dependency, since it depends
on data, not role.

### Full permission matrix (verified against `fastapi-backend/tests/test_rbac.py`, which asserts this exact matrix for every route)

| Endpoint | SUPER_ADMIN | HR_ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET/PATCH /employees/me` | ✅ | ✅ | ✅ | ✅ |
| `POST /employees/me/profile-image/*` | ✅ | ✅ | ✅ | ✅ |
| `GET /employees`, `GET /employees/{id}` | ✅ | ✅ | ✅ | ❌ |
| `POST /employees`, `PATCH /employees/{id}`, `DELETE /employees/{id}` | ✅ | ✅ | ❌ | ❌ |
| `GET /departments`, `GET /departments/{id}` | ✅ | ✅ | ✅ | ✅ |
| `POST /departments`, `PATCH /departments/{id}` | ✅ | ✅ | ❌ | ❌ |
| `DELETE /departments/{id}` | ✅ | ❌ | ❌ | ❌ |
| `GET /leave`, `POST /leave`, `PATCH /leave/{id}/cancel` | ✅ | ✅ | ✅ | ✅ (own only, enforced in service layer) |
| `PATCH /leave/{id}/approve`, `PATCH /leave/{id}/reject` | ✅ | ✅ | ✅ (not own request) | ❌ |
| `GET /notifications`, `PATCH .../read`, `PATCH .../read-all` | ✅ | ✅ | ✅ | ✅ (own only) |
| `GET /dashboard/summary` | ✅ | ✅ | ✅ | ✅ (personal view, not org view) |
| `GET /dashboard/trends`, `GET /dashboard/activity` | ✅ | ✅ | ✅ | ❌ |
| `GET /reports/summary` | ✅ | ❌ | ❌ | ❌ |
| `GET/PATCH /organization` | ✅ | ❌ | ❌ | ❌ |
| `GET /users/roles`, `PATCH /users/{id}/role` | ✅ | ❌ | ❌ | ❌ |
| `GET /audit` | ✅ | ✅ | ❌ | ❌ |

`POST /auth/register` is public and **always** creates an `EMPLOYEE` — there is no
way to self-register into a higher role.

---

## 7. FastAPI backend — architecture

```
Request
  │
  ▼
RateLimitMiddleware (ASGI, Redis-backed)   ── §9
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

## 8. FastAPI backend — complete API reference

Base path: **`/api/v1`**. Health check (no prefix): `GET /health`. Interactive
docs: `GET /api-docs` (Swagger UI, FastAPI's default `/docs` renamed).

Auth requirement column: 🔓 public · 🔑 any authenticated user · role names =
restricted to those roles (see [§6](#6-authorization-rbac) for the full matrix).

### Auth (`/auth`) — `app/api/v1/auth.py` → `auth_service.py`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{name, email, password}` | Always creates `EMPLOYEE`. Sets refresh cookie. |
| POST | `/auth/login` | 🔓 | `{email, password, remember?}` | `remember` controls the refresh cookie's `max_age` (session vs persistent). |
| POST | `/auth/refresh` | 🔓 (cookie) | — | Reads the `refreshToken` cookie, returns a new access token. |
| POST | `/auth/logout` | 🔓 | — | Clears the refresh cookie. |
| GET | `/auth/me` | 🔑 | — | Current user, looked up fresh from the DB. |

### Employees (`/employees`) — `employees.py` → `employees_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/employees/me` | 🔑 | Own employee record. 404 if no linked Employee. |
| PATCH | `/employees/me` | 🔑 | Self-update — **only** `phone`, `gender`, `dateOfBirth` accepted (see `EmployeeMeUpdateRequest`). |
| POST | `/employees/me/profile-image/upload-url` | 🔑 | Body `{contentType}` (jpeg/png/webp only) → pre-signed S3 PUT URL. |
| POST | `/employees/me/profile-image/confirm` | 🔑 | Body `{contentType}` → persists the (server-recomputed) S3 key after the client's direct-to-S3 upload succeeds. |
| GET | `/employees` | SUPER_ADMIN, HR_ADMIN, MANAGER | Full list for admins; MANAGER sees only their own department (resolved via their own linked Employee row). |
| GET | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN, MANAGER | Single record, 404 if missing. |
| POST | `/employees` | SUPER_ADMIN, HR_ADMIN | `{fullName, email, departmentId?, jobTitle?, status?, phone?, gender?, dateOfBirth?, joiningDate?}`. 409 if email taken. |
| PATCH | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN | Partial update, any of the create fields. |
| DELETE | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN | Hard delete. |

### Departments (`/departments`) — `departments.py` → `departments_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/departments` | 🔑 | List, each enriched with `employeeCount` and `manager` (the first Employee in that department whose linked User has role `MANAGER`). |
| GET | `/departments/{id}` | 🔑 | Single, same enrichment. |
| POST | `/departments` | SUPER_ADMIN, HR_ADMIN | `{name}`. Attached to the (single) Organization. |
| PATCH | `/departments/{id}` | SUPER_ADMIN, HR_ADMIN | `{name?}`. |
| DELETE | `/departments/{id}` | SUPER_ADMIN | |

### Leave (`/leave`) — `leave.py` → `leave_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/leave` | 🔑 | Admins/managers see all (optionally filtered by `?employeeId=`); employees see only their own. |
| POST | `/leave` | 🔑 | `{leaveType, startDate, endDate, reason}`. 400 if `startDate > endDate`. 404 if caller has no linked Employee. |
| PATCH | `/leave/{id}/approve` | SUPER_ADMIN, HR_ADMIN, MANAGER | `{comments?}`. 403 if you're approving your own request. 400 if not `PENDING`. Notifies the requester. |
| PATCH | `/leave/{id}/reject` | SUPER_ADMIN, HR_ADMIN, MANAGER | Same shape/checks as approve. |
| PATCH | `/leave/{id}/cancel` | 🔑 | Owner only (checked in service, not via role dep), and only while `PENDING`. |

### Notifications (`/notifications`) — `notifications.py` → `notification_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | 🔑 | Own notifications, newest first. |
| PATCH | `/notifications/{id}/read` | 🔑 | 404 if it's not yours. |
| PATCH | `/notifications/read-all` | 🔑 | Bulk-marks all your unread notifications read. |

### Dashboard (`/dashboard`) — `dashboard.py` → `dashboard_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/dashboard/summary` | 🔑 | Org-wide view (headcount, departments, leave pipeline counts, department breakdown) for SUPER_ADMIN/HR_ADMIN/MANAGER; personal view (own pending/approved leave, unread notifications) for EMPLOYEE. **Redis-cached**, see [§9](#9-redis-usage). |
| GET | `/dashboard/trends` | SUPER_ADMIN, HR_ADMIN, MANAGER | 12-month rolling: employee growth, monthly hiring, leave requests by status per month. Not cached. |
| GET | `/dashboard/activity` | SUPER_ADMIN, HR_ADMIN, MANAGER | Last 15 events (leave decisions + new hires), merged and sorted by timestamp. Not cached. |

### Reports (`/reports`) — `reports.py` → `reports_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reports/summary` | SUPER_ADMIN | Four breakdowns in one call: employees per department, employees by status, leave requests by status, users by role. |

### Organization (`/organization`) — `organization.py` → `organization_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/organization` | SUPER_ADMIN | The one Organization row. |
| PATCH | `/organization` | SUPER_ADMIN | `{name}`. |

### Users (`/users`) — `users.py` → `users_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/roles` | SUPER_ADMIN | Returns the static list `["SUPER_ADMIN","HR_ADMIN","MANAGER","EMPLOYEE"]`. |
| PATCH | `/users/{id}/role` | SUPER_ADMIN | `{role}`. Audit-logged (`USER_ROLE_CHANGED`, records from/to). |

### Audit (`/audit`) — `audit.py` → `audit_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit` | SUPER_ADMIN, HR_ADMIN | Query params `entityType?, entityId?, userId?, page?, pageSize?` (page defaults 1, pageSize defaults 25, capped at 100). Paginated response via `ok_paginated`. |

---

## 9. Redis usage

Two independent uses, both added this migration cycle, both fail open (Redis being
down degrades gracefully instead of breaking the app):

### 1. Dashboard summary cache (cache-aside)

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

### 2. Rate limiting (custom ASGI middleware)

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

`REDIS_URL` (local default `redis://localhost:6380/0`, matching Docker Compose's
Redis port mapping) is the single connection string for both uses.

---

## 10. S3 / file storage

`app/core/s3.py` — a boto3 client (`region_name=settings.aws_region`, credentials
via boto3's default chain: env vars locally, the EC2 instance's IAM role in
production — **never** hardcoded, never passed to the frontend). Two functions:

- `generate_presigned_put_url(key, content_type)` — a short-lived (5 min) URL the
  client can `PUT` a file to directly, no server involvement in the actual byte
  transfer.
- `generate_presigned_get_url(key)` — same idea for reading. Returns `None` if
  `S3_UPLOADS_BUCKET` isn't configured (so the app doesn't error in environments
  where file upload just isn't set up, e.g. local dev by default).

**Currently wired up for employee profile images only** (`employees_service.py`):

1. Client calls `POST /employees/me/profile-image/upload-url` with
   `{contentType: "image/jpeg" | "image/png" | "image/webp"}`.
2. Server computes a **deterministic** key —
   `employees/{employeeId}/profile-image.{ext}` — and returns a pre-signed PUT URL
   for it. One image per employee; a new upload overwrites the last one rather
   than accumulating objects.
3. Client `PUT`s the file bytes straight to that URL (S3, not the API).
4. Client calls `POST /employees/me/profile-image/confirm` with the *same*
   `{contentType}`. The server **recomputes** the identical key itself — it never
   trusts a key/path the client sends — and saves it on the Employee row.
5. Whenever an Employee is serialized in any API response, `profileImage` is
   resolved from the stored key to a fresh pre-signed **GET** URL on the way out
   (`employees_service.py::_serialize`) — the raw key is never exposed, and the
   bucket itself is fully private (no public bucket policy, all public-access-block
   settings on).

**Not yet implemented**: multi-document storage for employee documents or leave
attachments. That would need a new database table (documents don't map onto any
existing column — `Employee`/`LeaveRequest` have no document/attachment
relationship in the schema), which was deliberately not added without a decision
from the team, per "don't change the database design unnecessarily." The reusable
pieces (`generate_presigned_put_url`/`generate_presigned_get_url`) are already
there for whoever picks this up.

---

## 11. Frontend architecture

> The frontend was not modified this migration cycle and currently talks
> exclusively to the **Node** backend (`backend/`), not `fastapi-backend/` — see
> `VITE_API_BASE_URL` below.

### 11.1 Directory structure

```
frontend/
├── Dockerfile, nginx.conf         # multi-stage build → nginx static serve, see §11.9
├── index.html, vite.config.ts
├── tailwind.config.js, postcss.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example                   # VITE_API_BASE_URL=http://localhost:4000/api/v1 (only env var used)
├── .oxlintrc.json                 # oxlint (Rust-based linter) config — used instead of ESLint
└── src/
    ├── App.tsx                    # router + auth bootstrap (the router "lives" here, no separate router file)
    ├── main.tsx                   # provider tree: ThemeProvider → BrowserRouter → QueryClientProvider → App
    ├── index.css                  # Tailwind directives + HSL design-token CSS variables (light/dark)
    ├── components/
    │   ├── layout/                #   AppShell, Sidebar/MobileSidebar, Topbar, Breadcrumbs, UserMenu, ...
    │   ├── data-table/             #   generic TanStack Table wrapper (sort/filter/paginate/select)
    │   ├── charts/                 #   recharts wrappers: area/bar/donut, theme-aware tooltip/axes
    │   ├── dashboard/, employees/, departments/, leave/, profile/, reports/, settings/, audit/
    │   ├── shared/                 #   confirm-dialog (useConfirm), status-badge
    │   └── ui/                     #   shadcn/ui-style Radix + CVA primitives (button, dialog, select, table, ...)
    ├── hooks/                      # one file per domain, all TanStack Query — see §11.5/11.6
    ├── lib/
    │   ├── api.ts                  #   apiFetch / authFetch — see §11.4
    │   ├── cn.ts                   #   clsx + tailwind-merge helper
    │   ├── csv.ts                  #   CSV export (employees list)
    │   └── format.ts               #   date/number formatting helpers
    ├── pages/                      # one per route, all lazy()-imported — see §11.3
    └── types/index.ts              # shared TS types mirroring backend response shapes
```

**Key dependency versions** (`package.json`): React `19.2.8`, `react-dom` `19.2.8`,
`react-router-dom` `7.18.2`, `@tanstack/react-query` `5.101.4`,
`@tanstack/react-table` `8.21.3`, `react-hook-form` `7.83.0`,
`@hookform/resolvers` `5.5.7`, `zod` `4.4.3`, Radix UI primitives (`dialog`,
`select`, `dropdown-menu`, `tabs`, `tooltip`, `alert-dialog`, `avatar`, `checkbox`,
`separator`, `popover`, `slot`), `recharts` `3.10.1` (charts), `sonner` `2.0.7`
(toasts), `lucide-react` `1.28.0` (icons), `class-variance-authority` +
`tailwind-merge` (the shadcn-style `cn()` variant pattern). Build tooling: Vite
`8.2.0`, TypeScript `~6.0.2`, `oxlint` `1.75.0`.

`vite.config.ts` is minimal — just the React plugin, no path aliases, no dev
proxy (the app calls the API's full URL directly, cross-origin, relying on the
backend's CORS config). `tsconfig.app.json` builds with `noEmit: true` (Vite does
the actual transpile; `tsc -b` in the `build` script is purely a type-check gate).

### 11.2 Routing

Entirely in `src/App.tsx` — no separate router file, and no `<ProtectedRoute>`
wrapper component. Instead, the whole route tree branches on auth state:

- While the initial `GET /auth/me` bootstrap check is in flight (`isAuthReady ===
  false`), nothing renders.
- **Unauthenticated** (`user === null`): only `/login` and `/signup` (both
  `lazy()`-loaded) exist; everything else redirects to `/login` (preserving the
  attempted location in router state).
- **Authenticated**: `/login`/`/signup` redirect to `/dashboard`; every other page
  is nested under a layout route rendering `<AppShell>` (sidebar + topbar +
  `<Outlet/>` inside `<Suspense>`), wrapped in `<AuthContext.Provider>`. Routes:
  `/dashboard`, `/employees`, `/employees/:id`, `/departments`,
  `/departments/:id`, `/leave`, `/notifications`, `/reports`, `/audit`,
  `/settings`, `/profile`, plus `/` and `*` both redirecting to `/dashboard`.

**There is no route-level role guard.** Role-based UI restriction happens by
*not showing* nav links for disallowed roles (`nav-items.ts` filters by
`user.role`) and by pages conditionally rendering content — but nothing stops a
`MANAGER` from typing `/reports` into the address bar; the page will render and
its data hook will fire, at which point the **backend** is what actually returns
`403`. This matches the project-wide principle that authorization is a backend
concern — see [§6](#6-authorization-rbac) — but it does mean a disallowed user
briefly sees a broken/empty page rather than a clean "not allowed" redirect.

A global `window` event, `UNAUTHORIZED_EVENT` (dispatched from `lib/api.ts` when a
refresh-on-401 attempt fails), is caught in `App.tsx` to force logout + redirect
to `/login` from anywhere in the app — this is what actually fires when a session
expires mid-use, not a route guard.

### 11.3 Pages (`src/pages/`)

| Page | Route | Summary |
|---|---|---|
| `LoginPage` | `/login` | Plain `useState` form (not RHF/Zod — the one exception to §11.8's pattern), pre-filled demo credentials + "Use demo account" button, `remember` checkbox. |
| `SignupPage` | `/signup` | Same plain-state pattern, calls `POST /auth/register`. |
| `DashboardPage` | `/dashboard` | Role-aware: admins/managers get full KPIs + 4 trend charts + activity feed; plain employees get only the `PERSONAL`-scope summary (trend/activity hooks are conditionally `enabled: false` for them). |
| `EmployeesPage` | `/employees` | Full CRUD directory: `DataTable`, department/status filters in a `Sheet`, CSV export, bulk delete, `?q=` search synced with the topbar search box. `canManage` (SUPER_ADMIN/HR_ADMIN) gates add/edit/delete. |
| `EmployeeDetailPage` | `/employees/:id` | One employee + their leave history, tabbed (Overview/Personal/Employment/Leave History/Documents/Activity/Notes — **the last three tabs are UI placeholders, not wired to real data**). |
| `DepartmentsPage` | `/departments` | Grid of department cards; delete is SUPER_ADMIN-only, create/edit is SUPER_ADMIN/HR_ADMIN. |
| `DepartmentDetailPage` | `/departments/:id` | One department + its employees (filtered client-side from the full employee list); includes a stated placeholder stat ("open positions — not tracked yet"). |
| `LeavePage` | `/leave` | Stat cards + List/Calendar tabs; approve/reject/cancel actions inline; `canDecide` = SUPER_ADMIN/HR_ADMIN/MANAGER. |
| `NotificationsPage` | `/notifications` | Notifications grouped client-side into Today/Yesterday/Earlier; per-item and mark-all-read actions. |
| `ReportsPage` | `/reports` | Four donut-chart cards from the one `/reports/summary` call. |
| `AuditLogPage` | `/audit` | Audit trail table (up to 100 rows), formatted actor/action/entity/metadata columns. |
| `SettingsPage` | `/settings` | Appearance (theme toggle, anyone) + organization name edit (SUPER_ADMIN only). |
| `ProfilePage` | `/profile` | Own employee record, same tab layout as the detail page but the Personal tab is editable here. |

### 11.4 API layer — `src/lib/api.ts`

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_KEY = 'corehr-access-token';
export const UNAUTHORIZED_EVENT = 'corehr:unauthorized';
```

- **Token storage**: only the **access** token is kept in the browser
  (`localStorage` if "remember me" was checked, `sessionStorage` otherwise,
  `getAccessToken()` checks both). The refresh token is never touched by
  JavaScript — it's the backend's `httpOnly` cookie (see [§5](#5-authentication)),
  which is why every fetch call sets `credentials: 'include'`.
- **`apiFetch<T>()`** — unauthenticated helper (used only for
  login/register/refresh/logout): JSON headers, throws a plain `Error(message)`
  parsed from the backend's error body on any non-OK response.
- **`authFetch<T>()`** — the one every domain hook uses: attaches
  `Authorization: Bearer <token>`; on a `401` it calls `tryRefreshAccessToken()`
  (`POST /auth/refresh` via `apiFetch`) and, if that succeeds, **retries the
  original request once** with the new token; if refresh fails, it clears both
  token stores, dispatches `UNAUTHORIZED_EVENT`, and throws `"Session expired.
  Please sign in again."` — this is the single mechanism behind "you got logged
  out silently after your token expired."

### 11.5 State management

- **Auth** — `src/hooks/useAuth.tsx` defines only the context/hook
  (`useAuth()` throws if called outside a provider); the actual `AuthContext.Provider`
  lives in `App.tsx`, which owns `user`/`isAuthReady` state, the `/auth/me`
  bootstrap effect, and `handleLogin`/`handleSignup`/`logout`. Because the
  provider only wraps the *authenticated* route tree, `useAuth()` is safe to call
  from any page under `AppShell` — `user` is guaranteed non-null there.
- **Theme** — `src/hooks/useTheme.tsx`, a separate context wrapping the *entire*
  app (outside the router, in `main.tsx`). Persists to `localStorage`
  (`corehr-theme`), defaults to the `prefers-color-scheme` media query on first
  load, toggles a `.dark` class on `<html>`.
- **Server state** — `main.tsx` creates one `new QueryClient()` with **no custom
  `defaultOptions`** — all TanStack Query defaults apply (5s implicit staleness
  handling via `useQuery` defaults, refetch-on-window-focus on, etc.), except
  `useMyProfile()` which sets `retry: false`. No devtools package installed.
- **Misc local state**: sidebar collapse (`corehr-sidebar-collapsed` in
  `localStorage`, managed as component state in `AppShell`, not context); toasts
  via `sonner`'s imperative `toast.success()`/`toast.error()` API (one `<Toaster/>`
  mounted globally in `main.tsx`, no context needed to use it).

### 11.6 Custom hooks (`src/hooks/`)

Every list/detail/mutation hook follows the same shape: `useX()` for a list,
`useX(id)` for a detail (`enabled: !!id`), `useCreateX`/`useUpdateX`/`useDeleteX`
mutations that `invalidateQueries` the relevant keys (and `dashboard`/
`notifications` too, where the mutation affects those numbers) on success.

| Hook file | Exports | Backend calls |
|---|---|---|
| `useEmployees.ts` | `useEmployees`, `useEmployee(id)`, `useCreateEmployee`, `useUpdateEmployee`, `useDeleteEmployee` | `GET/POST/PATCH/DELETE /employees[/:id]` |
| `useDepartments.ts` | `useDepartments`, `useDepartment(id)`, `useCreateDepartment`, `useUpdateDepartment`, `useDeleteDepartment` | `GET/POST/PATCH/DELETE /departments[/:id]` |
| `useLeave.ts` | `useLeaveRequests(employeeId?)`, `useCreateLeaveRequest`, `useApproveLeaveRequest`, `useRejectLeaveRequest`, `useCancelLeaveRequest` | `GET/POST /leave`, `PATCH /leave/:id/{approve,reject,cancel}` |
| `useDashboard.ts` | `useDashboardSummary`, `useDashboardTrends(enabled)`, `useDashboardActivity(enabled)` | `GET /dashboard/{summary,trends,activity}` |
| `useNotifications.ts` | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` | `GET /notifications`, `PATCH /notifications/{:id/read,read-all}` |
| `useOrganization.ts` | `useOrganization`, `useUpdateOrganization` | `GET/PATCH /organization` |
| `useProfile.ts` | `useMyProfile` (`retry: false`), `useUpdateMyProfile` | `GET/PATCH /employees/me` |
| `useReports.ts` | `useReportsSummary` | `GET /reports/summary` |
| `useAudit.ts` | `useAuditLog` | `GET /audit?pageSize=100` |
| `useTheme.tsx` | `useTheme`, `ThemeProvider` | n/a (localStorage) |
| `useAuth.tsx` | `useAuth`, `AuthContext` | n/a (context; provider lives in `App.tsx`) |

(`useConfirm()` — a promise-based confirmation-dialog hook — is colocated with
its UI in `components/shared/confirm-dialog.tsx` rather than in `hooks/`.)

### 11.7 Types (`src/types/index.ts`)

Mirrors the backend's response shapes: `AppUser`, `UserRole`, `EmploymentStatus`,
`Department` (incl. resolved `employeeCount`/`manager`), `Employee` (incl. nested
`department`), `LeaveStatus`, `LeaveRequest` (incl. nested `employee` summary),
`Notification`, `Organization`, `AuditLogEntry`/`AuditLogResponse`. Two notably
precise ones:

- `DashboardSummary` is a **discriminated union on `scope`** — `'ORGANIZATION'`
  (totalEmployees, activeEmployees, departmentsCount, pending/approved/rejected
  leave counts, newEmployees, departmentBreakdown[]) vs. `'PERSONAL'`
  (myPendingLeaveRequests, myApprovedLeaveRequests, unreadNotifications) — matching
  the backend's role-branching in `dashboard_service.get_summary`.
- `ApiResponse<T> = { success: boolean; data: T }` — the generic envelope every
  hook unwraps.

Form-input types (`EmployeeFormInput`, `DepartmentInput`, `LeaveRequestInput`,
`ProfileUpdateInput`) live next to their Zod schemas in the relevant hook files,
not in `types/index.ts`.

### 11.8 Forms & validation (React Hook Form + Zod)

The standard pattern: a `zod` schema → `z.infer` type → `useForm({ resolver:
zodResolver(schema), values })` → `register`/`Controller` (for Radix `Select`,
which isn't a native input) → `handleSubmit` → a mutation's `.mutateAsync()` with
`toast.success`/`toast.error`. Field errors render through the shared
`<FormField label htmlFor error>` component.

Representative example — **leave request** (`components/leave/leave-request-dialog.tsx`),
which shows cross-field validation via `.refine()`:
```ts
const leaveFormSchema = z
  .object({
    leaveType: z.string().min(2, 'Leave type is required').max(80),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(2, 'Reason is required').max(500),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });
```

The **employee form** (`components/employees/employee-form-dialog.tsx`) is the
other notable one: it uses `values:` rather than `defaultValues:` on `useForm` so
the same dialog re-syncs correctly whether it's creating or editing (the editing
target can change while the dialog stays mounted), and uses a sentinel string
(`'__unassigned__'`) to represent "no department" in the `Select` since Radix's
`Select` can't hold an empty-string value — converted back to `null` on submit.

**Two deliberate exceptions to this pattern**: `LoginPage`/`SignupPage` (plain
`useState`, no client-side schema — see §11.3) and the Profile page's **Personal**
tab (`components/profile/personal-tab.tsx`), which is a hand-rolled edit-toggle
form with local `useState` synced via `useEffect`, not RHF/Zod at all.

### 11.9 Components (`src/components/`)

- **`layout/`** — `app-shell.tsx` (the authenticated shell), `sidebar.tsx` /
  `mobile-sidebar.tsx` (both filtered by `user.role` via `nav-items.ts`),
  `topbar.tsx` (breadcrumbs + search + theme toggle + notification bell + user
  menu), `notification-bell.tsx` (dropdown preview of the latest 5), `user-menu.tsx`.
- **`data-table/`** — a generic, reusable TanStack Table wrapper
  (`data-table.tsx`) plus a sortable column header, pagination controls, a
  row-actions dropdown, and a toolbar (search + column visibility). Domain
  screens supply column definitions via factory functions —
  `buildEmployeeColumns`, `buildLeaveColumns`, `auditColumns`.
- **`charts/`** — thin `recharts` wrappers (`ChartContainer`, a themed tooltip,
  and area/bar/donut chart components) driving the dashboard's 4 trend/
  distribution visualizations.
- **`ui/`** — a shadcn/ui-style primitive set (Radix UI + `class-variance-authority`
  variants + Tailwind): button, dialog, select, dropdown-menu, tabs, table, card,
  badge, tooltip, sheet, skeleton, stat-card, empty-state, error-banner,
  form-field, and more.
- **`shared/confirm-dialog.tsx`** — exports `useConfirm()`, a promise-based
  imperative confirmation pattern (`await confirm({...})` resolves to a boolean)
  built on the `AlertDialog` primitive.
- **`shared/status-badge.tsx`** — `EmploymentStatusBadge`/`LeaveStatusBadge`,
  mapping enum values to badge colors (e.g. `ACTIVE→success`,
  `TERMINATED→destructive`, `PENDING→warning`).
- **Domain folders** (`dashboard/`, `employees/`, `departments/`, `leave/`,
  `profile/`, `reports/`, `settings/`, `audit/`) hold the composed,
  page-specific pieces (dialogs, tabs, cards) built from the above primitives.
  Notable stubs: `profile/documents-tab.tsx`, `activity-tab.tsx`, `notes-tab.tsx`
  each just render an `EmptyState` — not wired to any real data or endpoint.

### 11.10 Styling

Tailwind CSS with `darkMode: 'class'` (a `.dark` class on `<html>`, toggled by
`ThemeProvider`, not a live `prefers-color-scheme` media query — that's only
consulted once, for the initial default). All colors are indirected through HSL
CSS custom properties declared in `src/index.css` (`:root` for light, `.dark` for
overrides) and exposed to Tailwind via `theme.extend.colors` using
`hsl(var(--x) / <alpha-value>)` — the standard shadcn/ui design-token pattern.
Tokens include `background`, `foreground`, `card`, `popover`, `primary`,
`secondary`, `muted`, `accent`, `success`, `warning`, `destructive`, `border`,
`input`, `ring`, and four `chart-N` colors for data viz. Font is a self-hosted
`@fontsource-variable/inter`. No CSS-in-JS.

### 11.11 Build & deploy

`frontend/Dockerfile` — two stages: `node:20-alpine` builds the app (`npm
install`, `npm run build`, with `VITE_API_BASE_URL` baked in as a build
ARG/ENV — **the API URL is fixed at image-build time, not configurable at
container runtime**), then `nginx:1.27-alpine` serves the static `dist/` output
on port 80. `nginx.conf` is a single minimal server block:
```nginx
location / { try_files $uri $uri/ /index.html; }
```
This is the SPA fallback — any path that isn't a real static file (e.g.
`/employees/123` on a hard refresh) falls through to `index.html`, letting React
Router's client-side routing take over. There's no API reverse-proxy or rewrite
rule here — the frontend calls `VITE_API_BASE_URL` directly, cross-origin, so CORS
must be (and is) handled entirely by the backend.

---

## 12. Node/Express backend (legacy, still live)

The original backend, still what's actually served in production/dev today. Not
re-documented in full detail here since `docs/ARCHITECTURE.md` already covers it
and it wasn't touched this migration cycle — see that file for its controllers/
services/routes/middleware layout, and the root `README.md` for its API reference
and seeded test accounts. Highlights relevant to understanding the migration:

- Prisma schema is genuinely the schema of record — the FastAPI SQLAlchemy models
  were derived from it, not the other way around.
- Per the root README, as of that doc: audit logging was schema-only there
  (`AuditLog` table present but nothing wrote to it) and Redis was "provisioned
  but unused." **Both of those gaps are specifically what the FastAPI backend
  closes** — real audit writes (§7) and real Redis usage (§9). If you're comparing
  the two backends, don't assume the Node README's "known gaps" section still
  describes the FastAPI side; it doesn't.

---

## 13. Current state & known gaps

What's real and working right now, vs. what's stubbed or not started, as of this
document:

**Fully implemented (FastAPI backend)**
- All API endpoints in [§8](#8-fastapi-backend--complete-api-reference).
- JWT auth, RBAC, audit logging, Redis caching + rate limiting, S3 profile images.
- Alembic migrations (one baseline, verified round-trip).
- Production Dockerfile (multi-stage, non-root, gunicorn, healthcheck).
- Local Docker Compose integration (own database, runs migrations on boot).
- CI job (Postgres + Redis services, migrate, test, Docker build).
- Full Terraform module for AWS (written and `terraform validate`-clean; **never
  applied** — no AWS resources have actually been created from it).
- 104 passing pytest tests (auth dependency, RBAC matrix, role-guard behavior).

**Not implemented / explicitly deferred**
- **Frontend still talks to the Node backend.** No cutover has happened; nothing
  in the frontend has been changed.
- **Employee documents / leave-request attachments** — S3 plumbing exists but
  isn't wired to a data model (no `Document` table).
- **Terraform has never been applied** — writing IaC and provisioning real AWS
  infrastructure are different milestones; only the former is done.
- **No linter configured for the Python backend** (no ruff/flake8 config) — CI
  runs tests and a migration check but not a lint step, unlike the Node side.
- **The pytest suite runs against a real database, not an isolated test DB** — no
  transaction rollback between tests. It's stable and passing, but be aware
  `test_role_restricted_route_allows_permitted_role` really does insert rows.
- Node backend's own gaps (per its README): schema supports multi-organization but
  only one is ever used; no document/compliance module there either.
- **Frontend UI stubs that render but do nothing real**: the Employee Detail /
  Profile pages' Documents, Activity, and Notes tabs are `EmptyState` placeholders
  with no backing endpoint; the Department Detail page's "open positions" stat is
  hardcoded as "not tracked yet"; the Dashboard's "today's attendance" stat is the
  same. None of these have any backend support to wire up to yet.
- **Frontend has no route-level role guard** — disallowed roles are kept off
  restricted pages by simply not showing the nav link, not by blocking the route;
  navigating directly to a restricted URL renders the page and lets the backend's
  `403` be the real enforcement (correct in principle — auth is a backend
  concern — but means a disallowed user briefly sees a broken/empty page instead
  of a redirect).
- **Frontend form-pattern inconsistency**: `LoginPage`/`SignupPage` and the
  Profile page's Personal tab don't use the React Hook Form + Zod pattern the rest
  of the app uses — plain `useState` instead, worth normalizing if anyone touches
  those files next.

---

## 14. Local development

### FastAPI backend, standalone (no Docker)

```bash
cd fastapi-backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # adjust DATABASE_URL if your local Postgres differs
alembic upgrade head        # creates the schema
uvicorn app.main:app --reload --port 8000
```

Needs a reachable Postgres (`DATABASE_URL`) and, for full functionality (caching,
rate limiting), a reachable Redis (`REDIS_URL`) — the app still runs and its tests
still pass without Redis (everything fails open), just without those two features
actually working.

### Node backend + frontend

See the root `README.md` — `npm install` at the root, `npx prisma migrate dev` +
`npm run prisma:seed` in `backend/`, `npm run dev` in both `backend/` and
`frontend/`. Seeded test accounts are listed there.

### Running everything together

See [§15](#15-docker--docker-compose) — `docker compose up --build` is the
one-command way to get Postgres, Redis, the Node backend, the FastAPI backend, and
the frontend all running.

---

## 15. Docker & Docker Compose

`docker-compose.yml` (repo root) defines five services:

| Service | Image / build | Host port → container port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5433 → 5432` | Creates `corehr` (Node) on first boot, plus `corehr_fastapi` via `scripts/postgres-init-multiple-dbs.sh` mounted into `/docker-entrypoint-initdb.d/`. |
| `redis` | `redis:7-alpine` | `6380 → 6379` | Shared by both backends (different key namespaces, no config needed). |
| `backend` | `./backend` | `4100 → 4000` | Node/Express. |
| `fastapi-backend` | `./fastapi-backend` | `8100 → 8000` | Runs `alembic upgrade head && gunicorn ...` as its `command` — migrations always run before the server starts, same production command with a migration step prepended. |
| `frontend` | `./frontend` | `4173 → 80` | Built with `VITE_API_BASE_URL=http://localhost:4100/api/v1` baked in at build time — points at the **Node** backend. Depends only on `backend`, not `fastapi-backend`. |

**Important caveat about `POSTGRES_MULTIPLE_DATABASES`**: the init script only
runs when Postgres's data volume is first created. If you already had a
`postgres_data` volume from before `fastapi-backend` was added to Compose, the
`corehr_fastapi` database won't exist yet — either recreate the volume
(`docker compose down -v` — **destroys existing data**, only do this if you don't
need it) or create it manually once: `docker compose exec postgres psql -U
postgres -c "CREATE DATABASE corehr_fastapi;"`.

`fastapi-backend/Dockerfile` — production-oriented multi-stage build:
1. **Builder stage** (`python:3.13-slim`): installs `requirements.txt` into
   `--user` site-packages.
2. **Final stage** (`python:3.13-slim`): non-root `app` user (`groupadd`/
   `useradd --system`), copies the installed packages + `app/`, `alembic/`,
   `alembic.ini`, `chown`s everything to `app:app`, drops to that user.
3. `HEALTHCHECK` hits `/health` via a plain `urllib` call (no `curl` in the slim
   image).
4. `CMD` runs `gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker
   --workers 2 --bind 0.0.0.0:8000` — no dev reload mode, ever.

---

## 16. Testing

`fastapi-backend/tests/` — pytest + `pytest-asyncio` + `httpx.AsyncClient` (via
`ASGITransport`, i.e. in-process, no real network socket) + `pyjwt` (to forge
tokens directly rather than going through `/login` for most tests).

- **`conftest.py`** — the `client` fixture (an `AsyncClient` wrapping the real
  `app`); `make_access_token`/`auth_header` helpers to forge JWTs for any role; and
  a **session-scoped, autouse** `seeded_role_users` fixture that upserts one real
  `User` row per role into the database and points the token helpers at those real
  IDs by default. This exists because some endpoints write real `AuditLog` rows
  keyed on the actor's user ID (a real, non-nullable-in-practice foreign key) — a
  fabricated `sub` claim with no matching `User` row causes a
  `ForeignKeyViolationError` the moment an audit-logged mutation runs.
- **`test_rbac.py`** — the full permission matrix from [§6](#6-authorization-rbac),
  parametrized: every route × every role, checking `401` unauthenticated, `403`
  disallowed, `2xx` allowed.
- **`test_auth_dependency.py`**, **`test_require_roles.py`** — unit-level checks
  of `get_current_user`/`require_roles` in isolation.

`pytest.ini` pins `asyncio_default_fixture_loop_scope = session` and
`asyncio_default_test_loop_scope = session`. This isn't cosmetic: the app's async
SQLAlchemy engine is a module-level singleton whose connection pool binds to
whichever event loop is active the first time it's used, and pytest-asyncio's
default is a *fresh* event loop per test — without pinning both to `session`, the
second DB-touching test in any run crashed with `RuntimeError: ... attached to a
different loop`.

**Caveat**: tests run against a real Postgres database (whatever `DATABASE_URL`
points at — no separate test-DB isolation, no per-test transaction rollback), so
running the suite does insert/mutate real rows (offset by the fact that most
mutating test paths hit deliberately-nonexistent IDs and 404 before writing
anything — see [§13](#13-current-state--known-gaps)).

Run it: `cd fastapi-backend && source .venv/bin/activate && pytest -q`.

---

## 17. CI/CD (GitHub Actions)

`.github/workflows/ci.yml` — triggers on push/PR to `main`/`master`. Two
independent jobs (run in parallel):

**`test-and-build`** (unchanged, Node/frontend) — `npm ci`, Prisma client
generation, lint frontend + backend, typecheck, `npm test` (backend), Prisma
migrate-deploy check, build frontend, build backend.

**`fastapi-backend`** (new):
1. Checkout.
2. `actions/setup-python@v5`, Python 3.13, pip cache keyed on
   `fastapi-backend/requirements.txt`.
3. `pip install -r requirements.txt`.
4. `alembic upgrade head` against a fresh `postgres:16-alpine` service container
   (`corehr_fastapi_ci` database) — the **production** migration command, not a
   dev-only one, run here specifically to catch migration bugs before they'd hit a
   real environment.
5. `pytest -q` — same real-database-backed suite as local, against the fresh CI
   Postgres + a `redis:7-alpine` service container.
6. `docker build` the production image, to catch Dockerfile breakage.

Both jobs' exact sequences were run locally against disposable databases before
being committed, specifically to verify the CI config would actually pass rather
than trusting it blind.

**Not in CI**: no `terraform plan`/`apply` step, and no deploy step (pushing to
ECR / triggering an EC2 redeploy). The Terraform module's own README documents the
intended manual bootstrap sequence; wiring an actual CD pipeline is future work.

---

## 18. Terraform / AWS production infrastructure

`infra/terraform/` — a complete, `terraform validate`-clean module for deploying
`fastapi-backend` to AWS. **Never applied** — this is infrastructure-as-*code*
only; no AWS account has actually had these resources created in it. Full usage
notes live in `infra/terraform/README.md`; this section is the architectural
summary.

### Topology

```
Internet
   │
   ▼
CloudFront ──── S3 (frontend static assets, private, OAC-only access)
   │
   │  (direct API calls, not through CloudFront)
   ▼
ALB (public subnets)  ──HTTP/HTTPS (443 only if a domain is configured)
   │
   ▼
Auto Scaling Group (private app subnets) ── EC2 running the Docker image from ECR
   │                    │
   ▼                    ▼
RDS PostgreSQL      ElastiCache Redis        S3 (uploads, private)
(private db subnets, (private db subnets,
 never public)        TLS + at-rest encryption)
```

### Per-file summary

| File | Provisions |
|---|---|
| `providers.tf` | AWS provider (`var.aws_region`) + a `us-east-1`-aliased provider used only for the CloudFront ACM cert (CloudFront requires certs from `us-east-1` regardless of the stack's actual region). |
| `variables.tf` | Every knob — region, CIDRs, instance sizes, `domain_name`/`route53_zone_id` (both optional — HTTP-only if unset), `github_repository` (gates whether the OIDC role is created at all), `alarm_email`. |
| `vpc.tf` | VPC across 2 AZs; public / private-app / private-db subnet tiers; **one** NAT Gateway (cost-optimized, not one per AZ); a free S3 gateway VPC endpoint; the DB subnet tier has **no route to the internet at all**. |
| `security-groups.tf` | ALB: 80/443 from anywhere. EC2: app port from ALB only. RDS: 5432 from EC2 only. Redis: 6379 from EC2 only. |
| `iam.tf` | EC2 instance role (SSM Session Manager access instead of SSH keys; ECR pull scoped to this one repo; S3 access scoped to the uploads bucket only; SSM `GetParameter` scoped to this project's parameter path). GitHub Actions OIDC provider + role (created only if `github_repository` is set) — federated trust, no long-lived AWS keys, scoped to ECR push + SSM `SendCommand` (tag-scoped to instances named `${project_name}-app`) + frontend S3 sync + CloudFront invalidation. |
| `ecr.tf` | One repository, `IMMUTABLE` tags, scan-on-push, lifecycle policy (expire untagged after 7 days, keep last 20 tagged). |
| `ec2.tf` | SNS alarm topic; **Terraform-generated** JWT secrets + DB password, stored as SSM `SecureString` parameters (never in a docker image, git repo, or plaintext user data); a CloudWatch log group; the launch template + Auto Scaling Group (fixed size, IMDSv2-only, encrypted EBS); CPU/memory/disk CloudWatch alarms. |
| `alb.tf` | The ALB, target group (health check `/health`), conditional ACM cert + HTTPS listener (only if `domain_name` set — otherwise HTTP-only), 4xx/5xx/unhealthy-host alarms. |
| `rds.tf` | Single-AZ `db.t3.micro` Postgres, `gp3` storage, encrypted, private, `skip_final_snapshot`/`deletion_protection` deliberately off (so `terraform destroy` tears it down cleanly between sessions — flip both for real production use), connection-count and free-storage alarms. |
| `redis.tf` | `aws_elasticache_replication_group` (not the plain `_cluster` resource — needed for at-rest/in-transit encryption even at one node), single node, TLS required (app must connect with `rediss://`), CPU/memory alarms. |
| `s3.tf` | Frontend bucket (versioned, encrypted, all public-access-block settings on — access is via CloudFront's OAC only) and uploads bucket (private, versioned, encrypted, CORS rule scoped to `client_url`, lifecycle rule expiring old object versions). |
| `cloudfront.tf` | Distribution fronting the frontend S3 bucket via Origin Access Control; SPA fallback (403/404 → `index.html`, 200); conditional custom domain + `us-east-1` ACM cert. |
| `outputs.tf` | ALB DNS name, API/frontend URLs, ECR repo URL, RDS/Redis endpoints (marked `sensitive`), the GitHub Actions role ARN, the ASG name. |

### What running this for real would need

1. Bootstrap: `terraform apply -target=aws_ecr_repository.backend`, then manually
   `docker build`/`push` at least one `:latest` image (the ASG's first instance
   pulls that tag on boot — nothing exists yet on a truly fresh account).
2. `terraform.tfvars` from `terraform.tfvars.example` — region, optionally a real
   domain + Route53 zone, optionally a GitHub repo for OIDC, an alarm email.
3. `terraform apply` for everything else.
4. This is real, billable infrastructure the moment you apply it (RDS, the NAT
   Gateway, ElastiCache, and the ALB all charge per hour regardless of traffic) —
   see the cost note in `infra/terraform/README.md`.

---

## 19. Environment variables reference

### `fastapi-backend/.env`

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | `production` triggers the insecure-JWT-secret startup check. |
| `PORT` | `8000` | |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/corehr` | Standard `postgresql://` form — converted to `postgresql+asyncpg://` internally (`Settings.asyncpg_database_url`). |
| `REDIS_URL` | `redis://localhost:6380/0` | Used for both caching and rate limiting. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | insecure placeholders | **Must** be overridden before `APP_ENV=production` — the app refuses to start otherwise. |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | Duration strings (`\d+[smhd]`). |
| `CLIENT_URL` | `http://localhost:5173,http://localhost:4173` | Comma-separated allowed CORS origins. |
| `AWS_REGION` | `ap-south-1` | Used by the S3 client. |
| `S3_UPLOADS_BUCKET` | *(empty)* | File-upload endpoints return `501` while this is unset. |

### `infra/terraform/terraform.tfvars`

See [§18](#18-terraform--aws-production-infrastructure) and
`infra/terraform/terraform.tfvars.example` — every variable has a workable
default except `aws_region` (recommended to set explicitly).

### Node backend / frontend

See the root `README.md` for `backend/.env` and `frontend/.env` — not changed
this migration cycle.

---

## 20. Glossary

- **cuid** — collision-resistant, URL-safe unique ID format used for every primary
  key in both backends (`cuid2` package on the Python side, Prisma's built-in
  `cuid()` on the Node side).
- **RBAC** — role-based access control; see [§6](#6-authorization-rbac).
- **Cache-aside** — a caching pattern where the application checks the cache
  first, falls through to the real data source on a miss, then populates the
  cache — as opposed to the cache being updated proactively on every write. Used
  for the dashboard summary ([§9](#9-redis-usage)).
- **Pre-signed URL** — a time-limited URL that grants temporary permission to
  upload/download one specific S3 object, generated server-side using AWS
  credentials the client never sees, without the file's bytes ever passing through
  the API server itself.
- **OAC (Origin Access Control)** — the modern AWS mechanism for letting
  CloudFront (and only CloudFront) read from a private S3 bucket, without the
  bucket needing any public access.
- **ASG (Auto Scaling Group)** — a set of EC2 instances managed as a group; here
  used at a fixed size (not for elastic scaling) mainly so the ALB target group
  registration and instance self-healing come for free.

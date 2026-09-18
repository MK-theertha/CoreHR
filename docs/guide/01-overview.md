[← Back to Documentation index](./README.md)

# Overview

## What CoreHR is

CoreHR is a workforce-management web app for a single organization (the schema
supports more than one, but only one is ever seeded/used today). It covers:

- **Employee directory** — HR records with contact info, job title, department,
  employment status, and a profile image.
- **Departments** — a flat list, each employee belongs to at most one.
- **Leave management** — employees request leave; managers/HR/admins approve or
  reject it; requesters can cancel their own pending requests. Approving/rejecting
  fires a notification to the requester (in-app **and** email).
- **Notifications** — an in-app inbox plus email, populated by leave submissions,
  decisions, and cancellations.
- **Role-aware dashboard** — org-wide counts (headcount, departments, leave
  pipeline) for admins/managers, personal counts (own pending/approved leave,
  unread notifications) for regular employees.
- **Reports** — breakdowns by department, employment status, leave status, and
  user role — SUPER_ADMIN only, with CSV export.
- **Audit log** — every employee create/update/delete, leave request/approve/
  reject/cancel, and role change is recorded with actor, IP, and a metadata blob;
  viewable (SUPER_ADMIN/HR_ADMIN) via `GET /api/v1/audit`.
- **User/role administration** — SUPER_ADMIN can change any user's role.
- **Organization settings** — SUPER_ADMIN can view/rename the (single) organization.

Four roles, strictly enforced server-side (see
[Authorization (RBAC)](./04-authorization-rbac.md)): `SUPER_ADMIN`, `HR_ADMIN`,
`MANAGER`, `EMPLOYEE`.

## Repository layout

```
CoreHR/
├── backend/                    # Node/Express/Prisma API — legacy, rollback path only
│   ├── prisma/schema.prisma    #   Prisma schema (source of truth for the Node side)
│   └── src/
│       ├── config/             #   env loading, Prisma client, swagger
│       ├── controllers/        #   one per domain
│       ├── services/             #   Prisma queries + business logic
│       ├── routes/               #   Express routers + Zod validation + RBAC
│       └── middleware/           #   protect (JWT), authorize (roles), validate, errorHandler
│
├── fastapi-backend/            # Python/FastAPI/SQLAlchemy API — the live backend
│   ├── app/
│   │   ├── main.py             #   FastAPI app: middleware, router mount, /health
│   │   ├── core/                #   config, security (JWT/bcrypt), errors, rate_limit, redis, s3, email, util
│   │   ├── db/                  #   base.py (engine/session), models.py (SQLAlchemy models)
│   │   ├── deps.py              #   get_db, get_current_user, require_roles, CurrentUser
│   │   ├── schemas/             #   Pydantic request models, one file per domain
│   │   ├── api/v1/               #   FastAPI routers, one file per domain
│   │   └── services/             #   business logic + DB queries, one file per domain
│   ├── alembic/                 #   migrations (env.py wired to app.core.config.settings)
│   │   └── versions/            #   baseline schema + one incremental (Document table)
│   ├── scripts/seed.py           #   idempotent dev-data seed, mirrors backend/prisma/seed.ts
│   ├── tests/                    #   pytest + pytest-asyncio, hits a real Postgres + Redis
│   ├── Dockerfile                #   multi-stage, non-root, gunicorn+uvicorn workers
│   ├── requirements.txt
│   ├── alembic.ini
│   └── pytest.ini
│
├── frontend/                    # React 19 + Vite SPA — talks to fastapi-backend/
│   └── src/
│       ├── pages/, hooks/, lib/api.ts, types/, components/   # see Frontend Architecture
│
├── infra/terraform/             # AWS infrastructure-as-code for fastapi-backend
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
│   └── guide/                     # this documentation
├── package.json                   # npm workspaces root (frontend + backend only — not fastapi-backend)
└── README.md                      # quick-start pointer
```

## Tech stack

| Layer | FastAPI backend (live) | Node backend (legacy) | Frontend |
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
| Email | boto3 → SES (background tasks) | — | — |
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

Next: [Data Model →](./02-data-model.md)

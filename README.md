# CoreHR — Employee Management Platform

CoreHR is a full-stack workforce management system: employee directory, leave
requests with an approval workflow, in-app + email notifications, audit logging,
a role-aware dashboard, and CSV report exports — all wired to a real database, no
mock or in-memory data.

**New here? Start with [`docs/guide/`](docs/guide/README.md)** — a from-the-
ground-up reference covering everything, split into one page per topic: the data
model, every API endpoint, authentication/RBAC, Redis usage, S3 file storage,
the frontend, local dev, Docker, CI, and the Terraform AWS infrastructure. It
assumes no prior familiarity with the codebase. This README is just a
quick-start pointer.

## The live stack

CoreHR started as a Node/Express/Prisma API and has since been migrated to
Python/FastAPI/SQLAlchemy — **that's what the frontend actually talks to today**.

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod |
| Backend (**live**) | `fastapi-backend/` — FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, Redis, JWT auth, boto3 (S3 + SES) |
| Backend (legacy) | `backend/` — Express 5, Prisma 7, PostgreSQL. Still runnable standalone as a rollback path; nothing depends on it anymore and it receives no further changes. |
| Infra | Docker Compose (Postgres + Redis + both backends + frontend), GitHub Actions CI, Terraform (AWS — written, not yet applied) |

## Repository layout

```
fastapi-backend/   # live API — app/api (routers) → app/services (business logic) → SQLAlchemy → Postgres
  app/core/         # config, JWT, S3, SES email, Redis, rate limiting, error handling
  app/services/     # business logic per domain (employees, leave, notifications, reports, audit, ...)
  app/api/v1/       # thin routers — parse request, call one service function, wrap the response
  alembic/          # database migrations
  tests/            # pytest suite (185 tests)
backend/            # legacy Node/Express/Prisma API — rollback path only, see docs/guide/10-legacy-node-backend.md
frontend/           # React app, talks to fastapi-backend via VITE_API_BASE_URL
infra/terraform/    # AWS infrastructure as code (VPC, ALB, ASG, RDS, ElastiCache, S3, CloudFront, IAM)
docs/
  guide/                  # the full reference, one page per topic — read this for anything beyond a quick start
```

## Quick start (Docker Compose — recommended)

```bash
docker compose up -d postgres redis
docker compose up --build fastapi-backend frontend
```

- Frontend: http://localhost:4173
- FastAPI backend: http://localhost:8100 (health check at `/health`, interactive docs at `/api-docs`)
- Postgres: host port `5433`, Redis: host port `6380`

The FastAPI container runs `alembic upgrade head` automatically on boot. To seed
sample data (organization, departments, the accounts below, sample leave
requests):

```bash
cd fastapi-backend
source .venv/bin/activate   # or: python -m venv .venv && pip install -r requirements.txt
python scripts/seed.py
```

### Seeded test accounts

| Email | Password | Role |
|---|---|---|
| admin@corehr.dev | Admin@123 | SUPER_ADMIN |
| manager@corehr.dev | Manager@123 | MANAGER |
| alicia.morgan@corehr.dev | Employee@123 | EMPLOYEE |

## Running the FastAPI backend standalone (no Docker)

See [Local Development](docs/guide/12-local-development.md) for the full
walkthrough (venv setup, `.env`, running Postgres/Redis locally).

## Running the tests

```bash
cd fastapi-backend
source .venv/bin/activate
pytest -q
```

185 tests: RBAC permission matrix, auth (incl. refresh-token revocation), leave
workflow, notifications, reports/dashboard (incl. CSV export), audit logging,
per-employee activity, notes, department open positions, and document upload
against a mocked S3. See [Testing](docs/guide/14-testing.md) for
details and caveats (tests run against a real Postgres + Redis, not mocks).

## CI

`.github/workflows/ci.yml` runs two jobs on every push/PR to `main`: one lints/
tests/builds the legacy Node backend, and one spins up real Postgres + Redis
service containers, runs Alembic migrations, runs the FastAPI pytest suite, and
does a Docker build sanity check. See [CI/CD](docs/guide/15-cicd.md).

## Full documentation

Everything else — the complete data model, every API endpoint with its exact
role requirements, how JWT auth and refresh-token revocation work, RBAC
internals, Redis usage (caching, rate limiting, revocation), S3 file storage and
SES email notifications, the frontend architecture, environment variables, and
the Terraform AWS topology — lives in **[`docs/guide/`](docs/guide/README.md)**,
one page per topic:

1. [Overview](docs/guide/01-overview.md)
2. [Data Model](docs/guide/02-data-model.md)
3. [Authentication](docs/guide/03-authentication.md)
4. [Authorization (RBAC)](docs/guide/04-authorization-rbac.md)
5. [Backend Architecture](docs/guide/05-backend-architecture.md)
6. [API Reference](docs/guide/06-api-reference.md)
7. [Redis Usage](docs/guide/07-redis.md)
8. [File Storage & Email](docs/guide/08-file-storage-and-email.md)
9. [Frontend Architecture](docs/guide/09-frontend.md)
10. [Legacy Node Backend](docs/guide/10-legacy-node-backend.md)
11. [Current State & Known Gaps](docs/guide/11-known-gaps.md)
12. [Local Development](docs/guide/12-local-development.md)
13. [Docker & Docker Compose](docs/guide/13-docker.md)
14. [Testing](docs/guide/14-testing.md)
15. [CI/CD (GitHub Actions)](docs/guide/15-cicd.md)
16. [Terraform / AWS Infrastructure](docs/guide/16-terraform.md)
17. [Environment Variables](docs/guide/17-environment-variables.md)
18. [Glossary](docs/guide/18-glossary.md)

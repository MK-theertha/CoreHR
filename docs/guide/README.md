# CoreHR Documentation

A from-the-ground-up reference for the whole CoreHR system: what it does, every
technology in it, how the repository is laid out, the full data model, every API
endpoint, and how local dev / CI / production deployment work. Each page below
assumes no prior familiarity with the codebase — start with **Overview** and read
in order, or jump straight to whatever you need.

> **Read this first — the app has cut over to the FastAPI backend.** CoreHR
> started as a Node/Express/Prisma API and has been migrated to
> Python/FastAPI/SQLAlchemy. Both backends still exist in the repo:
> - **`fastapi-backend/`** — the Python/FastAPI/SQLAlchemy API. **This is what the
>   frontend actually talks to now** (`frontend`'s `VITE_API_BASE_URL` points at
>   it, both locally and in `docker-compose.yml`, where the `frontend` service
>   depends on `fastapi-backend`, not `backend`). Verified end-to-end in a real
>   browser (Playwright) against the Docker Compose stack: login, every main page,
>   and a full leave-request → approval → notification write path, all against
>   real seeded data, zero console errors.
> - **`backend/`** — the original Node/Express/Prisma API. Kept in the repo and
>   still runnable standalone (`docker compose up backend`) as a rollback path,
>   but nothing depends on it anymore and it receives no further changes.
>
> Everything in this guide is written against the **current, real state of the
> code** (not the original design intent) — see
> [Current State & Known Gaps](./11-known-gaps.md) for the precise list of what's
> implemented, what's stubbed, and what's still Node-only.

## Pages

| # | Page | What's in it |
|---|---|---|
| 1 | [Overview](./01-overview.md) | What CoreHR is, repository layout, tech stack |
| 2 | [Data Model](./02-data-model.md) | Every table, column, relationship, and the Alembic migration history |
| 3 | [Authentication](./03-authentication.md) | JWT access/refresh tokens, the auth flow, server-side refresh-token revocation |
| 4 | [Authorization (RBAC)](./04-authorization-rbac.md) | The four roles, how they're enforced, the full permission matrix |
| 5 | [Backend Architecture](./05-backend-architecture.md) | Router → Service → Database layering, response envelope, error handling, conventions |
| 6 | [API Reference](./06-api-reference.md) | Every endpoint, method, required role, and what it does |
| 7 | [Redis Usage](./07-redis.md) | Dashboard caching, rate limiting, refresh-token revocation — all three uses |
| 8 | [File Storage & Email](./08-file-storage-and-email.md) | S3 presigned uploads/downloads, profile images, documents, SES email notifications |
| 9 | [Frontend Architecture](./09-frontend.md) | React app structure, routing, state management, hooks, forms, styling, build |
| 10 | [Legacy Node Backend](./10-legacy-node-backend.md) | What's still there from the original Express/Prisma API and why |
| 11 | [Current State & Known Gaps](./11-known-gaps.md) | What's fully implemented vs. stubbed, as of today |
| 12 | [Local Development](./12-local-development.md) | Running the FastAPI backend, frontend, and Node backend without Docker |
| 13 | [Docker & Docker Compose](./13-docker.md) | Every service, ports, the Dockerfile, and a data-volume caveat |
| 14 | [Testing](./14-testing.md) | The pytest suite, fixtures, conventions, and caveats worth knowing before you add a test |
| 15 | [CI/CD (GitHub Actions)](./15-cicd.md) | What the two CI jobs actually do |
| 16 | [Terraform / AWS Infrastructure](./16-terraform.md) | The full production topology, per-file summary, what applying it would need |
| 17 | [Environment Variables](./17-environment-variables.md) | Every `.env` variable, its default, and what it controls |
| 18 | [Glossary](./18-glossary.md) | Terms used throughout this guide |

## Quick start

For a fast path to running the app locally, see the root
[`README.md`](../../README.md) — this guide is the deep reference, not the
quick-start.

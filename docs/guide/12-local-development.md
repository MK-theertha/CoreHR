[← Back to Documentation index](./README.md) · [← Current State & Known Gaps](./11-known-gaps.md)

# Local Development

## FastAPI backend, standalone (no Docker)

```bash
cd fastapi-backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # adjust DATABASE_URL if your local Postgres differs
alembic upgrade head        # creates the schema
python -m scripts.seed      # creates the org, 2 departments, 3 login accounts (idempotent)
uvicorn app.main:app --reload --port 8000
```

Needs a reachable Postgres (`DATABASE_URL`) and, for full functionality (caching,
rate limiting), a reachable Redis (`REDIS_URL`) — the app still runs and its tests
still pass without Redis (everything fails open), just without those two features
actually working.

**Seeded accounts** (`fastapi-backend/scripts/seed.py`, mirrors the Node
backend's Prisma seed — same credentials work against either):

| Email | Password | Role |
|---|---|---|
| `admin@corehr.dev` | `Admin@123` | SUPER_ADMIN |
| `manager@corehr.dev` | `Manager@123` | MANAGER |
| `alicia.morgan@corehr.dev` | `Employee@123` | EMPLOYEE |

Run the seed script once per database — it's idempotent (safe to re-run; it
upserts by email/slug rather than inserting duplicates).

## Node backend (rollback path only)

Still in the repo and fully functional standalone, but nothing depends on it
anymore. See the root `README.md` for its own setup — `npm install` at the root,
`npx prisma migrate dev` + `npm run prisma:seed` in `backend/`, `npm run dev`.

## Frontend

`cd frontend && npm install && npm run dev` — reads `VITE_API_BASE_URL` from
`.env` (defaults to `fastapi-backend` at `http://localhost:8100/api/v1`). Use the
same seeded accounts above to log in.

## Running everything together

See [Docker & Docker Compose](./13-docker.md) — `docker compose up --build` is
the one-command way to get Postgres, Redis, the FastAPI backend (what the
frontend actually uses), the frontend, and the Node backend (available but idle)
all running.

---

[← Current State & Known Gaps](./11-known-gaps.md) · Next: [Docker & Docker Compose →](./13-docker.md)

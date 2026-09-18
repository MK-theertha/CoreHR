[← Back to Documentation index](./README.md) · [← Local Development](./12-local-development.md)

# Docker & Docker Compose

`docker-compose.yml` (repo root) defines five services:

| Service | Image / build | Host port → container port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5433 → 5432` | Creates `corehr` (Node) on first boot, plus `corehr_fastapi` via `scripts/postgres-init-multiple-dbs.sh` mounted into `/docker-entrypoint-initdb.d/`. |
| `redis` | `redis:7-alpine` | `6380 → 6379` | Shared by both backends (different key namespaces, no config needed). |
| `backend` | `./backend` | `4100 → 4000` | Node/Express — still runnable, nothing depends on it anymore. |
| `fastapi-backend` | `./fastapi-backend` | `8100 → 8000` | Runs `alembic upgrade head && gunicorn ...` as its `command` — migrations always run before the server starts, same production command with a migration step prepended. Also ships `scripts/seed.py` (`docker compose exec fastapi-backend python -m scripts.seed`). |
| `frontend` | `./frontend` | `4173 → 80` | Built with `VITE_API_BASE_URL=http://localhost:8100/api/v1` baked in at build time — points at **FastAPI**. `depends_on: fastapi-backend`. |

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

[← Local Development](./12-local-development.md) · Next: [Testing →](./14-testing.md)

[← Back to Documentation index](./README.md) · [← Terraform / AWS Infrastructure](./16-terraform.md)

# Environment Variables Reference

## `fastapi-backend/.env`

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | `production` triggers the insecure-JWT-secret startup check. |
| `PORT` | `8000` | |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/corehr` | Standard `postgresql://` form — converted to `postgresql+asyncpg://` internally (`Settings.asyncpg_database_url`). |
| `REDIS_URL` | `redis://localhost:6380/0` | Used for caching, rate limiting, **and** refresh-token revocation — see [Redis Usage](./07-redis.md). |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | insecure placeholders | **Must** be overridden before `APP_ENV=production` — the app refuses to start otherwise. |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | Duration strings (`\d+[smhd]`). |
| `CLIENT_URL` | `http://localhost:5173,http://localhost:4173` | Comma-separated allowed CORS origins. |
| `AWS_REGION` | `ap-south-1` | Used by the S3 and SES clients. |
| `S3_UPLOADS_BUCKET` | *(empty)* | File-upload endpoints return `501` while this is unset. |
| `EMAIL_ENABLED` | `false` | Must be explicitly `true` for `app/core/email.py::send_email` to call SES at all — otherwise every email send is a silent no-op. |
| `SES_FROM_EMAIL` | *(empty)* | The verified SES sender identity. Emails still no-op if this is empty, even with `EMAIL_ENABLED=true`. |

## `infra/terraform/terraform.tfvars`

See [Terraform / AWS Infrastructure](./16-terraform.md) and
`infra/terraform/terraform.tfvars.example` — every variable has a workable
default except `aws_region` (recommended to set explicitly).

## `frontend/.env`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8100/api/v1` | Points at `fastapi-backend` (changed from `:4100`, the Node backend, as part of the cutover). Baked in at build time — see [Frontend Architecture](./09-frontend.md). |

## `backend/.env` (Node, rollback path only)

See the root `README.md` — unchanged.

---

[← Terraform / AWS Infrastructure](./16-terraform.md) · Next: [Glossary →](./18-glossary.md)

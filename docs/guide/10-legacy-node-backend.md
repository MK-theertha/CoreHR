[← Back to Documentation index](./README.md) · [← Frontend Architecture](./09-frontend.md)

# Node/Express Backend (Legacy, Rollback Path)

The original backend. As of the cutover (see
[Current State & Known Gaps](./11-known-gaps.md)), nothing in the running app
depends on it anymore, but it's kept fully functional in the repo and in
`docker-compose.yml` as a rollback option. It receives no further changes, so
it isn't re-documented endpoint-by-endpoint here — read `backend/src/` directly
if you need specifics (`routes/` → `controllers/` → `services/`, Express 5 +
Prisma 7, same layered structure as the FastAPI backend). Highlights relevant to
understanding the migration:

- Prisma schema is genuinely the schema of record — the FastAPI SQLAlchemy models
  were derived from it, not the other way around.
- In the Node backend, audit logging was schema-only (`AuditLog` table present
  but nothing wrote to it) and Redis was provisioned but unused. **Both of those
  gaps are specifically what the FastAPI backend closes** — real audit writes
  ([Backend Architecture](./05-backend-architecture.md)) and real Redis usage
  ([Redis Usage](./07-redis.md)). If you're comparing the two backends, don't
  assume the Node side's old gaps still describe the FastAPI side; they don't.

---

[← Frontend Architecture](./09-frontend.md) · Next: [Current State & Known Gaps →](./11-known-gaps.md)

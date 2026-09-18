[← Back to Documentation index](./README.md) · [← Legacy Node Backend](./10-legacy-node-backend.md)

# Current State & Known Gaps

What's real and working right now, vs. what's stubbed or not started, as of this
document.

## Fully implemented (FastAPI backend)

- All API endpoints in [API Reference](./06-api-reference.md), including employee
  documents and leave-request attachments (`Document` table, S3-backed —
  [File Storage & Email](./08-file-storage-and-email.md)).
- JWT auth (including server-side refresh-token revocation on logout — see
  [Authentication](./03-authentication.md)), RBAC, audit logging, Redis caching +
  rate limiting, S3 profile images + multi-document storage, email notifications
  on leave submit/decide/cancel (SES, no-op without AWS creds — see
  [File Storage & Email](./08-file-storage-and-email.md)), and CSV export for
  reports/dashboard (see [API Reference](./06-api-reference.md)).
- Alembic migrations (baseline + one incremental for `Document`, both verified
  round-trip: upgrade → `alembic check` reports zero drift → downgrade). None of
  the four most-recently-added features (email, CSV export, refresh-token
  revocation, expanded tests) needed a schema change — token versioning and rate
  limiting live entirely in Redis, email/CSV are stateless.
- Production Dockerfile (multi-stage, non-root, gunicorn, healthcheck).
- Local Docker Compose integration (own database, runs migrations on boot).
- CI job (Postgres + Redis services, migrate, test, Docker build).
- Full Terraform module for AWS (written and `terraform validate`-clean; **never
  applied** — no AWS resources have actually been created from it). The EC2 IAM
  role does **not** yet include `ses:SendEmail` — email sending needs that added
  before `EMAIL_ENABLED=true` would work in a real deployment.
- 174 passing pytest tests (auth dependency, RBAC matrix incl. the document
  routes, role-guard behavior, document upload/confirm/list/delete against a
  mocked S3 via `moto`, leave workflow incl. mocked email sends, notifications,
  reports/dashboard incl. CSV export, audit log, and refresh-token revocation
  incl. a Redis-outage fail-open case).
- **The frontend cutover.** `VITE_API_BASE_URL` now points at `fastapi-backend`
  everywhere (local `.env`, Docker Compose, the Dockerfile's build-time default);
  `docker-compose.yml`'s `frontend` service depends on `fastapi-backend`, not
  `backend`. Verified with a real headless-browser pass (Playwright) against the
  Docker Compose stack: login as each seeded role, every main page renders real
  data with zero console errors, and a full write path (submit a leave request as
  `alicia.morgan@corehr.dev`, approve it as `admin@corehr.dev`, confirm the
  notification lands) works end-to-end. `fastapi-backend/scripts/seed.py`
  provides the same three login accounts as the Node backend's Prisma seed, so
  nothing about "how do I log in" changed for anyone using this app.

## Not implemented / explicitly deferred

- **The frontend doesn't have UI for the document endpoints yet** — the Employee
  Detail / Profile pages' Documents tab is still the `EmptyState` placeholder
  noted in [Frontend Architecture](./09-frontend.md); the backend capability
  exists but nothing calls it. Same precedent as profile images, which also
  shipped backend-first.
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
- **Email delivery has no real queue** — SES sends run as FastAPI `BackgroundTasks`
  inline in a gunicorn worker, not a real task queue. Fine at current scale; a
  stuck/slow SES call would tie up a worker under real load. See
  [File Storage & Email](./08-file-storage-and-email.md).

---

[← Legacy Node Backend](./10-legacy-node-backend.md) · Next: [Local Development →](./12-local-development.md)

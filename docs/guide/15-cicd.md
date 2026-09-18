[← Back to Documentation index](./README.md) · [← Testing](./14-testing.md)

# CI/CD (GitHub Actions)

`.github/workflows/ci.yml` — triggers on push/PR to `main`/`master`. Two
independent jobs (run in parallel):

**`test-and-build`** (unchanged, Node/frontend) — `npm ci`, Prisma client
generation, lint frontend + backend, typecheck, `npm test` (backend), Prisma
migrate-deploy check, build frontend, build backend.

**`fastapi-backend`**:
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

[← Testing](./14-testing.md) · Next: [Terraform / AWS Infrastructure →](./16-terraform.md)

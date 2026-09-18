[← Back to Documentation index](./README.md) · [← Docker & Docker Compose](./13-docker.md)

# Testing

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
- **`test_rbac.py`** — the full permission matrix from
  [Authorization (RBAC)](./04-authorization-rbac.md), parametrized: every route ×
  every role, checking `401` unauthenticated, `403` disallowed, and *not*
  `401`/`403` for allowed roles (not strictly `2xx` — a few routes, including the
  document ones with a nonexistent target entity or S3 unconfigured, correctly
  return `404`/`400`/`501` for an allowed role too; the matrix is testing the
  permission boundary, not the full business-logic result).
- **`test_documents.py`** — the actual business logic the RBAC matrix doesn't
  cover: unsupported content type, S3-not-configured, confirming an upload that
  never happened, leave-document visibility (an unrelated employee gets `404`),
  and a full upload → confirm → list → delete round trip against a **mocked** S3
  (`moto` — no real AWS account needed to run the suite).
- **`test_auth_dependency.py`**, **`test_require_roles.py`** — unit-level checks
  of `get_current_user`/`require_roles` in isolation.
- **`test_leave.py`** — the leave workflow business logic the RBAC matrix doesn't
  cover: create/approve/reject/cancel, role-scoped visibility (an `EMPLOYEE` sees
  only their own requests), the self-approval block, and re-deciding/re-cancelling
  an already-decided request. Email sends (`email_service.send_leave_*`) are
  `monkeypatch`ed to `Mock()`s per test so nothing calls real SES.
- **`test_notifications.py`** — list/mark-read/mark-all-read against a seeded
  notification row, including the cross-user 404.
- **`test_reports.py`**, **`test_dashboard.py`** — response shape assertions for
  the JSON endpoints, plus the CSV export endpoints: content-type is `text/csv`,
  `Content-Disposition` is present, and the body round-trips through `csv.reader`
  into the expected `## <SectionName>` markers.
- **`test_audit.py`** — triggers a real audit-logged mutation (creating an
  Employee) and asserts the resulting `AuditLog` row and pagination shape.
- **`test_auth_refresh_revocation.py`** — login → `/refresh` succeeds → `/logout`
  → replaying the *pre-logout* refresh cookie against `/refresh` now gets `401` →
  a fresh `/login` still works. Plus one case that monkeypatches the Redis client
  to raise on every call, asserting `/refresh` still succeeds — proving the
  fail-open behavior described in [Authentication](./03-authentication.md)
  actually holds.

`pytest.ini` pins `asyncio_default_fixture_loop_scope = session` and
`asyncio_default_test_loop_scope = session`. This isn't cosmetic: the app's async
SQLAlchemy engine is a module-level singleton whose connection pool binds to
whichever event loop is active the first time it's used, and pytest-asyncio's
default is a *fresh* event loop per test — without pinning both to `session`, the
second DB-touching test in any run crashed with `RuntimeError: ... attached to a
different loop`.

## Caveats

- Tests run against a real Postgres database (whatever `DATABASE_URL` points at —
  no separate test-DB isolation, no per-test transaction rollback), so running the
  suite does insert/mutate real rows (offset by the fact that most mutating test
  paths hit deliberately-nonexistent IDs and 404 before writing anything — see
  [Current State & Known Gaps](./11-known-gaps.md)).
- Tests also run against a **real Redis** (the rate limiter and cache aren't
  mocked) — `test_auth_refresh_revocation.py` and `test_leave.py` genuinely call
  `/auth/register` and `/auth/login`, which are rate-limited to 10 requests per
  15 minutes per path (see [Redis Usage](./07-redis.md)). Running the full suite
  twice in quick succession *can* trip that limit and produce confusing `429`s
  partway through an otherwise-correct suite — if that happens locally,
  `redis-cli -p 6380 flushall` clears it (CI never hits this, since each run gets
  a fresh Redis container).
- `EmailStr`-validated request bodies (`RegisterRequest`, `EmployeeCreateRequest`,
  etc.) reject the `.test` TLD — Python's `email-validator` treats it as a
  reserved/special-use domain per RFC 2606, distinct from the seeded `User` rows
  in `conftest.py`, which use `@corehr.test` addresses but are inserted directly
  via SQLAlchemy, bypassing Pydantic validation entirely. Any *new* test that
  posts an email address through an actual endpoint needs a real-looking TLD (the
  existing convention is `@corehr.dev`), not `@corehr.test`.

Run it: `cd fastapi-backend && source .venv/bin/activate && pytest -q`.

---

[← Docker & Docker Compose](./13-docker.md) · Next: [CI/CD (GitHub Actions) →](./15-cicd.md)

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
- 190 passing pytest tests (auth dependency, RBAC matrix incl. the document
  routes, role-guard behavior, document upload/confirm/list/delete against a
  mocked S3 via `moto`, leave workflow incl. mocked email sends, notifications,
  reports/dashboard incl. CSV export, audit log, refresh-token revocation incl. a
  Redis-outage fail-open case, department `openPositions`, per-employee activity,
  notes CRUD + edit incl. staff-only RBAC, and the `Employee.role` field).
- **Employee editing from the Employee Detail and Department Detail pages.**
  Both now open the existing `EmployeeFormDialog` (previously only reachable
  from the `/employees` list) — no new dialog, just wiring `canManage`/
  `onEdit`/`onDelete` through `buildEmployeeColumns` the same way
  `EmployeesPage.tsx` already does. The Department Detail page's employee
  table can now edit/remove employees directly, and the Employee Detail page
  has an "Edit" button (SUPER_ADMIN/HR_ADMIN).
- **Department manager assignment.** `Employee` responses now include the
  linked user's `role` (new `selectinload(Employee.user)` + a `role` field in
  `employees_service._serialize` — additive, no schema change). A new
  "Assign manager" dialog (SUPER_ADMIN only, matching `PATCH /users/{id}/role`'s
  backend RBAC) promotes the selected employee's user to `MANAGER` and demotes
  the previous manager back to `EMPLOYEE`, reusing the existing (previously
  frontend-unused) role-management endpoint. Candidates are restricted to
  employees whose current role is `EMPLOYEE`/`MANAGER` — never
  SUPER_ADMIN/HR_ADMIN — to prevent accidentally demoting an admin account.
- **Note editing.** `PATCH /employees/{id}/notes/{noteId}` (same `STAFF_ROLES`
  gate as create/delete), audit-logged as `EMPLOYEE_NOTE_UPDATED`. The
  frontend's Notes tab now has an inline edit toggle per note instead of
  delete-and-re-add being the only option.
- **The frontend Documents tab.** Wired to the existing backend endpoints —
  upload → direct-to-S3 PUT → confirm → list → delete — on both the Profile
  (self-service, `/employees/me/documents...`) and Employee Detail
  (staff-facing, `/employees/{id}/documents...`) pages. Client-side
  content-type allowlist matches the backend's. `DELETE` is restricted to
  SUPER_ADMIN/HR_ADMIN on the staff-facing variant.
- **A client-side route guard.** `ProtectedRoute` wraps `/employees`,
  `/employees/:id`, `/reports`, and `/audit` — a disallowed role now gets
  redirected to `/dashboard` with a toast instead of a rendered-then-403 page.
  Reuses `nav-items.ts`'s existing role lists as the single source of truth.
- **Form pattern consistency.** `LoginPage`, `SignupPage`, and the Profile
  page's Personal tab now use React Hook Form + Zod, matching every other form
  in the app.
- **Per-employee Activity tab**, backed by a new
  `audit_service.list_for_employee` (unions Employee-scoped and
  LeaveRequest-scoped audit entries for that employee) and
  `GET /employees/{id}/activity` — self-viewable by the employee, viewable for
  anyone by SUPER_ADMIN/HR_ADMIN/MANAGER.
- **Notes tab**, backed by a new `Note` table (direct FK to Employee, not the
  Document/AuditLog polymorphic pattern) and `/employees/{id}/notes`
  endpoints — deliberately staff-only (SUPER_ADMIN/HR_ADMIN/MANAGER), both
  read and write; not shown at all on the employee's own Profile page.
- **Dashboard "today's attendance."** Computed with zero schema change —
  active employees minus those on an approved leave covering today — added to
  `dashboard_service._org_summary` as `presentToday`/`onLeaveToday`.
- **Department "open positions."** A new nullable `openPositions` column,
  settable from the department create/edit dialog, shown on the Department
  Detail page.
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

- **Terraform has never been applied** — writing IaC and provisioning real AWS
  infrastructure are different milestones; only the former is done.
- **No linter configured for the Python backend** (no ruff/flake8 config) — CI
  runs tests and a migration check but not a lint step, unlike the Node side.
- **The pytest suite runs against a real database, not an isolated test DB** — no
  transaction rollback between tests. It's stable and passing, but be aware
  `test_role_restricted_route_allows_permitted_role` really does insert rows.
- Node backend's own gaps (per its README): schema supports multi-organization but
  only one is ever used; no document/compliance module there either.
- **Email delivery has no real queue** — SES sends run as FastAPI `BackgroundTasks`
  inline in a gunicorn worker, not a real task queue. Fine at current scale; a
  stuck/slow SES call would tie up a worker under real load. See
  [File Storage & Email](./08-file-storage-and-email.md).
- **`PATCH /users/{id}/role` has no demotion safeguards beyond the frontend's
  own filtering** — it's a blind single-user role overwrite; the "assign
  manager" dialog is the only caller today and handles demoting the previous
  manager itself, but the endpoint itself would let a SUPER_ADMIN patch any
  user to any role directly (e.g. via `/api-docs`), including demoting another
  admin. Worth a guard if more callers get added.

---

[← Legacy Node Backend](./10-legacy-node-backend.md) · Next: [Local Development →](./12-local-development.md)

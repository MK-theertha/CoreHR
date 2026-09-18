[← Back to Documentation index](./README.md) · [← Backend Architecture](./05-backend-architecture.md)

# FastAPI Backend — Complete API Reference

Base path: **`/api/v1`**. Health check (no prefix): `GET /health`. Interactive
docs: `GET /api-docs` (Swagger UI, FastAPI's default `/docs` renamed).

Auth requirement column: 🔓 public · 🔑 any authenticated user · role names =
restricted to those roles (see [Authorization (RBAC)](./04-authorization-rbac.md)
for the full matrix).

## Auth (`/auth`) — `app/api/v1/auth.py` → `auth_service.py`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{name, email, password}` | Always creates `EMPLOYEE`. Sets refresh cookie. |
| POST | `/auth/login` | 🔓 | `{email, password, remember?}` | `remember` controls the refresh cookie's `max_age` (session vs persistent). |
| POST | `/auth/refresh` | 🔓 (cookie) | — | Reads the `refreshToken` cookie, returns a new access token. Rejects with `401` if the token's version doesn't match the current one (see [Authentication](./03-authentication.md)). |
| POST | `/auth/logout` | 🔓 | — | Clears the refresh cookie **and** revokes it server-side (bumps the user's token version). |
| GET | `/auth/me` | 🔑 | — | Current user, looked up fresh from the DB. |

## Employees (`/employees`) — `employees.py` → `employees_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/employees/me` | 🔑 | Own employee record. 404 if no linked Employee. |
| PATCH | `/employees/me` | 🔑 | Self-update — **only** `phone`, `gender`, `dateOfBirth` accepted (see `EmployeeMeUpdateRequest`). |
| POST | `/employees/me/profile-image/upload-url` | 🔑 | Body `{contentType}` (jpeg/png/webp only) → pre-signed S3 PUT URL. |
| POST | `/employees/me/profile-image/confirm` | 🔑 | Body `{contentType}` → persists the (server-recomputed) S3 key after the client's direct-to-S3 upload succeeds. |
| GET | `/employees` | SUPER_ADMIN, HR_ADMIN, MANAGER | Full list for admins; MANAGER sees only their own department (resolved via their own linked Employee row). |
| GET | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN, MANAGER | Single record, 404 if missing. |
| POST | `/employees` | SUPER_ADMIN, HR_ADMIN | `{fullName, email, departmentId?, jobTitle?, status?, phone?, gender?, dateOfBirth?, joiningDate?}`. 409 if email taken. |
| PATCH | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN | Partial update, any of the create fields. |
| DELETE | `/employees/{id}` | SUPER_ADMIN, HR_ADMIN | Hard delete. |
| GET/POST | `/employees/me/documents[/upload-url,/confirm]`, `DELETE /employees/me/documents/{docId}` | 🔑 | Own documents — see [File Storage & Email](./08-file-storage-and-email.md) for the upload flow. 404 (via `get_me`) if caller has no linked Employee. |
| GET/POST | `/employees/{id}/documents[/upload-url,/confirm]` | STAFF_ROLES (GET) / ADMIN_ROLES (POST) | Same flow, on behalf of any employee — e.g. HR uploading a new hire's ID scan. 404 if `id` doesn't exist. |
| DELETE | `/employees/{id}/documents/{docId}` | SUPER_ADMIN, HR_ADMIN | |
| GET | `/employees/{id}/activity` | 🔑 (self) or STAFF_ROLES (anyone) | An employee viewing their own record, or SUPER_ADMIN/HR_ADMIN/MANAGER viewing anyone's. 404 (not 403) for a non-staff caller viewing someone else's. Merges Employee-scoped and LeaveRequest-scoped audit entries, paginated. |
| GET | `/employees/{id}/notes` | SUPER_ADMIN, HR_ADMIN, MANAGER | Internal HR notes — deliberately staff-only, never shown to the employee about themselves. |
| POST | `/employees/{id}/notes` | SUPER_ADMIN, HR_ADMIN, MANAGER | `{body}`. Audit-logged (`EMPLOYEE_NOTE_CREATED`). |
| DELETE | `/employees/{id}/notes/{noteId}` | SUPER_ADMIN, HR_ADMIN, MANAGER | Audit-logged (`EMPLOYEE_NOTE_DELETED`). |

## Departments (`/departments`) — `departments.py` → `departments_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/departments` | 🔑 | List, each enriched with `employeeCount` and `manager` (the first Employee in that department whose linked User has role `MANAGER`). |
| GET | `/departments/{id}` | 🔑 | Single, same enrichment. |
| POST | `/departments` | SUPER_ADMIN, HR_ADMIN | `{name, openPositions?}`. Attached to the (single) Organization. |
| PATCH | `/departments/{id}` | SUPER_ADMIN, HR_ADMIN | `{name?, openPositions?}`. |
| DELETE | `/departments/{id}` | SUPER_ADMIN | |

## Leave (`/leave`) — `leave.py` → `leave_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/leave` | 🔑 | Admins/managers see all (optionally filtered by `?employeeId=`); employees see only their own. |
| POST | `/leave` | 🔑 | `{leaveType, startDate, endDate, reason}`. 400 if `startDate > endDate`. 404 if caller has no linked Employee. Emails the requester a submission confirmation (background task, best-effort). |
| PATCH | `/leave/{id}/approve` | SUPER_ADMIN, HR_ADMIN, MANAGER | `{comments?}`. 403 if you're approving your own request. 400 if not `PENDING`. Notifies the requester in-app **and** by email. |
| PATCH | `/leave/{id}/reject` | SUPER_ADMIN, HR_ADMIN, MANAGER | Same shape/checks/notifications as approve. |
| PATCH | `/leave/{id}/cancel` | 🔑 | Owner only (checked in service, not via role dep), and only while `PENDING`. Emails the requester a cancellation confirmation. |
| GET/POST | `/leave/{id}/documents[/upload-url,/confirm]` | 🔑 | Visible to the request's own employee or CAN_MANAGE roles (SUPER_ADMIN/HR_ADMIN/MANAGER) — anyone else gets a 404, not a 403, so a leave request's existence isn't leaked. See `leave_service.get_visible_leave_request`. |
| DELETE | `/leave/{id}/documents/{docId}` | 🔑 | Same visibility gate; the owner can only remove documents while the request is still `PENDING`, CAN_MANAGE roles can any time. |

## Notifications (`/notifications`) — `notifications.py` → `notification_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | 🔑 | Own notifications, newest first. |
| PATCH | `/notifications/{id}/read` | 🔑 | 404 if it's not yours. |
| PATCH | `/notifications/read-all` | 🔑 | Bulk-marks all your unread notifications read. |

## Dashboard (`/dashboard`) — `dashboard.py` → `dashboard_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/dashboard/summary` | 🔑 | Org-wide view (headcount, departments, leave pipeline counts, department breakdown, `presentToday`/`onLeaveToday` — active employees minus those on an approved leave covering today, zero new schema) for SUPER_ADMIN/HR_ADMIN/MANAGER; personal view (own pending/approved leave, unread notifications) for EMPLOYEE. **Redis-cached**, see [Redis Usage](./07-redis.md). |
| GET | `/dashboard/trends` | SUPER_ADMIN, HR_ADMIN, MANAGER | 12-month rolling: employee growth, monthly hiring, leave requests by status per month. Not cached. |
| GET | `/dashboard/activity` | SUPER_ADMIN, HR_ADMIN, MANAGER | Last 15 events (leave decisions + new hires), merged and sorted by timestamp. Not cached. |
| GET | `/dashboard/trends/export` | SUPER_ADMIN, HR_ADMIN, MANAGER | Same data as `/trends`, as a downloadable CSV (`Content-Disposition: attachment`). See **CSV exports** below. |

## Reports (`/reports`) — `reports.py` → `reports_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reports/summary` | SUPER_ADMIN | Four breakdowns in one call: employees per department, employees by status, leave requests by status, users by role. |
| GET | `/reports/summary/export` | SUPER_ADMIN | Same data as `/summary`, as a downloadable CSV. |

### CSV exports

`app/core/csv_export.py::dict_rows_to_csv_response(sections, filename)` — a small
shared helper, no new dependency (Python's stdlib `csv` module + `io.StringIO` +
FastAPI's `StreamingResponse`). Both export endpoints reuse it: they call the
*same* service function their JSON sibling calls (`reports_service.get_summary` /
`dashboard_service.get_trends`), then hand the resulting `{section_name:
[row_dict, ...]}` mapping to the helper instead of wrapping it in `ok()`. The CSV
renders one `## <SectionName>` marker line, a header row, and the data rows, per
section — so `/reports/summary/export` produces one file with four labeled blocks
rather than four separate downloads. Each export endpoint sits under the exact
same `require_roles(...)` gate as its JSON counterpart — no separate auth code
needed. Buffers the whole CSV in memory rather than truly streaming row-by-row;
fine at this data volume (org-wide breakdowns, ~12 months of trend rows), would
need revisiting for a bulk/row-level export of raw records.

## Organization (`/organization`) — `organization.py` → `organization_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/organization` | SUPER_ADMIN | The one Organization row. |
| PATCH | `/organization` | SUPER_ADMIN | `{name}`. |

## Users (`/users`) — `users.py` → `users_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/roles` | SUPER_ADMIN | Returns the static list `["SUPER_ADMIN","HR_ADMIN","MANAGER","EMPLOYEE"]`. |
| PATCH | `/users/{id}/role` | SUPER_ADMIN | `{role}`. Audit-logged (`USER_ROLE_CHANGED`, records from/to). |

## Audit (`/audit`) — `audit.py` → `audit_service.py`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit` | SUPER_ADMIN, HR_ADMIN | Query params `entityType?, entityId?, userId?, page?, pageSize?` (page defaults 1, pageSize defaults 25, capped at 100). Paginated response via `ok_paginated`. |

---

[← Backend Architecture](./05-backend-architecture.md) · Next: [Redis Usage →](./07-redis.md)

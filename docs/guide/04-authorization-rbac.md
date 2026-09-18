[← Back to Documentation index](./README.md) · [← Authentication](./03-authentication.md)

# Authorization (RBAC)

Enforced **server-side only** (the frontend does not gate rendering by role in any
way that should be trusted — that's a UX nicety, not a security boundary). Four
roles: `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`.

## Mechanism (FastAPI)

`app/deps.py`:
- `get_current_user` — authentication only (any valid token).
- `require_roles(*roles)` — a dependency factory; returns a dependency that calls
  `get_current_user` and then raises `403 Forbidden: insufficient permissions` if
  the user's role isn't in the allowed set.

Every router either depends on `get_current_user` (any authenticated user) at the
router level, and/or attaches `Depends(require_roles(...))` to specific routes for
stricter checks. `POST /api/v1/leave/{id}/cancel` for example only requires
authentication — the *ownership* check ("is this your own pending request?")
happens inside `leave_service.cancel`, not via a role dependency, since it depends
on data, not role.

## Full permission matrix

Verified against `fastapi-backend/tests/test_rbac.py`, which asserts this exact
matrix for every route:

| Endpoint | SUPER_ADMIN | HR_ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET/PATCH /employees/me` | ✅ | ✅ | ✅ | ✅ |
| `POST /employees/me/profile-image/*` | ✅ | ✅ | ✅ | ✅ |
| `GET /employees`, `GET /employees/{id}` | ✅ | ✅ | ✅ | ❌ |
| `POST /employees`, `PATCH /employees/{id}`, `DELETE /employees/{id}` | ✅ | ✅ | ❌ | ❌ |
| `GET /departments`, `GET /departments/{id}` | ✅ | ✅ | ✅ | ✅ |
| `POST /departments`, `PATCH /departments/{id}` | ✅ | ✅ | ❌ | ❌ |
| `DELETE /departments/{id}` | ✅ | ❌ | ❌ | ❌ |
| `GET /leave`, `POST /leave`, `PATCH /leave/{id}/cancel` | ✅ | ✅ | ✅ | ✅ (own only, enforced in service layer) |
| `PATCH /leave/{id}/approve`, `PATCH /leave/{id}/reject` | ✅ | ✅ | ✅ (not own request) | ❌ |
| `GET /notifications`, `PATCH .../read`, `PATCH .../read-all` | ✅ | ✅ | ✅ | ✅ (own only) |
| `GET /dashboard/summary` | ✅ | ✅ | ✅ | ✅ (personal view, not org view) |
| `GET /dashboard/trends`, `GET /dashboard/activity`, `GET /dashboard/trends/export` | ✅ | ✅ | ✅ | ❌ |
| `GET /reports/summary`, `GET /reports/summary/export` | ✅ | ❌ | ❌ | ❌ |
| `GET/PATCH /organization` | ✅ | ❌ | ❌ | ❌ |
| `GET /users/roles`, `PATCH /users/{id}/role` | ✅ | ❌ | ❌ | ❌ |
| `GET /audit` | ✅ | ✅ | ❌ | ❌ |

`POST /auth/register` is public and **always** creates an `EMPLOYEE` — there is no
way to self-register into a higher role.

Two routes added since this matrix was last verified against `test_rbac.py` have
their own dedicated test files instead (`test_employee_activity.py`,
`test_notes.py`), since they don't fit the simple "fixed role list" shape the
matrix above captures:

| Endpoint | SUPER_ADMIN | HR_ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|
| `GET /employees/{id}/activity` | ✅ (any) | ✅ (any) | ✅ (any) | ✅ (own record only — 404 for anyone else's) |
| `GET/POST/PATCH/DELETE /employees/{id}/notes...` | ✅ | ✅ | ✅ | ❌ (even for their own record) |

**Department manager assignment** is a frontend-only concept layered on top of
the existing role system, not a separate permission — the "Assign manager"
dialog (Department Detail page, SUPER_ADMIN only in the UI) works by calling
`PATCH /users/{id}/role` twice (demote the old manager, promote the new one),
so it's gated by that endpoint's existing `SUPER_ADMIN`-only RBAC, not a new
rule. See [API Reference](./06-api-reference.md).

---

[← Authentication](./03-authentication.md) · Next: [Backend Architecture →](./05-backend-architecture.md)

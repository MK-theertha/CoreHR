# CoreHR — Employee Management Platform

CoreHR is a full-stack workforce management system: employee directory, leave
requests with an approval workflow, notifications, and a role-aware
dashboard. It's a monorepo with an Express/Prisma/PostgreSQL API and a
React/Vite/Tailwind frontend, both fully wired to a real database — no mock
or in-memory data.

## Tech stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod |
| Backend  | Express 5, TypeScript, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, JWT auth, Zod validation |
| Infra    | Docker Compose (Postgres + Redis + backend + frontend), GitHub Actions CI |

## Repository layout

```
backend/
  prisma/schema.prisma   # data model (source of truth)
  prisma/seed.ts         # seeds org, roles, departments, users, sample data
  prisma.config.ts       # Prisma 7 CLI config (schema path, seed command, datasource URL)
  src/
    config/              # env, Prisma client (with pg driver adapter), swagger
    controllers/         # one per domain: auth, employee, department, leave, notification, dashboard
    services/             # Prisma queries + business logic live here
    routes/               # Express routers, per-route Zod validation + RBAC
    middleware/           # protect (JWT), authorize (role check), validate (Zod), errorHandler
frontend/
  src/
    pages/               # one page per route: Dashboard, Employees, Leave, Notifications, Profile, Login
    hooks/               # TanStack Query hooks per domain (useEmployees, useLeave, useNotifications, ...) + useAuth context
    lib/api.ts           # fetch helpers: apiFetch (public) and authFetch (adds bearer token, retries once on 401 via refresh token)
    types/                # shared TS types mirroring the API response shapes
```

## Data model

Defined in `backend/prisma/schema.prisma`:

- **Organization** — top-level tenant; every Department/User/Employee belongs to one (single org is seeded today, but the schema supports more).
- **Role** — one of `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`.
- **User** — login identity (email + bcrypt password hash + role). Optionally linked 1:1 to an `Employee`.
- **Department** — belongs to an Organization, has many Employees.
- **Employee** — the HR record (name, contact info, job title, department, employment status). Optionally linked to a `User` for self-service login.
- **LeaveRequest** — belongs to an Employee, has a status (`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`) and an optional approver `User`.
- **Notification** — belongs to a `User`; auto-created when a leave request is approved/rejected.
- **AuditLog** — present in the schema for future use; not yet written to by the API.

## Auth & roles

JWT-based auth (`Authorization: Bearer <token>`), with short-lived access tokens (15m default) and longer-lived refresh tokens (7d default). The frontend's `authFetch` transparently retries once via `/auth/refresh` on a 401 before forcing logout.

Role permissions, enforced server-side per route:

| Role | Employees | Leave | Notifications | Profile |
|------|-----------|-------|----------------|---------|
| SUPER_ADMIN / HR_ADMIN | full CRUD | view all, approve/reject any | own | own (view + edit own fields) |
| MANAGER | read-only list | view all, approve/reject others' (not own) | own | own |
| EMPLOYEE | no access to the directory | apply, view own, cancel own pending | own | own |

Public self-registration (`POST /auth/register`) always creates an `EMPLOYEE` — it cannot be used to grant elevated roles.

## API reference

Base path: `/api/v1`. All routes except `/auth/register`, `/auth/login`, `/auth/refresh` require a bearer token.

**Auth** — `auth.routes.ts`
- `POST /auth/register` — create an EMPLOYEE-role account
- `POST /auth/login` — returns `{ user, accessToken, refreshToken }`
- `POST /auth/refresh` — exchange a refresh token for a new access token
- `GET /auth/me` — current user

**Employees** — `employee.routes.ts`
- `GET /employees/me` / `PATCH /employees/me` — own employee record (any authenticated user with a linked profile); self-update is limited to `phone`, `gender`, `dateOfBirth`
- `GET /employees` — list (SUPER_ADMIN, HR_ADMIN, MANAGER)
- `GET /employees/:id` — single record (+ EMPLOYEE)
- `POST /employees` / `PATCH /employees/:id` / `DELETE /employees/:id` — (SUPER_ADMIN, HR_ADMIN)

**Departments** — `department.routes.ts`
- `GET /departments` — list (any authenticated user)
- `POST /departments` — create (SUPER_ADMIN, HR_ADMIN)

**Leave** — `leave.routes.ts`
- `GET /leave` — all requests for admins/managers, own requests only for employees
- `POST /leave` — apply (requires a linked employee profile)
- `PATCH /leave/:id/approve` / `PATCH /leave/:id/reject` — (SUPER_ADMIN, HR_ADMIN, MANAGER); creates a notification for the requester
- `PATCH /leave/:id/cancel` — owner only, pending requests only

**Notifications** — `notification.routes.ts`
- `GET /notifications` — own notifications
- `PATCH /notifications/:id/read` / `PATCH /notifications/read-all`

**Dashboard** — `dashboard.routes.ts`
- `GET /dashboard/summary` — org-wide counts + department breakdown for admins/managers; personal leave/notification counts for employees

**Users** — `user.routes.ts`
- `GET /users/roles`, `PATCH /users/role` — role listing/update stub (SUPER_ADMIN)

Swagger UI is served at `/api-docs`.

## Getting started (local dev)

1. **Database**: `docker compose up -d postgres` (exposed on host port `5433` to avoid clashing with a local Postgres).
2. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # adjust CLIENT_URL/DATABASE_URL if needed
   npx prisma migrate dev # applies migrations
   npm run prisma:seed    # seeds roles, departments, and the accounts below
   npm run dev            # http://localhost:4000
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev            # http://localhost:5173 (or next free port)
   ```

In development, backend CORS accepts any `http://localhost:<port>` origin (see `backend/src/app.ts`), so multiple Vite instances/ports don't require `.env` changes. In production, only the exact origins listed in `CLIENT_URL` are allowed.

### Seeded test accounts

| Email | Password | Role |
|-------|----------|------|
| admin@corehr.dev | Admin@123 | SUPER_ADMIN |
| manager@corehr.dev | Manager@123 | MANAGER |
| alicia.morgan@corehr.dev | Employee@123 | EMPLOYEE |

### Useful scripts

- `backend`: `npm run dev` / `build` / `start`, `npm run prisma:generate`, `npm run prisma:studio`, `npm run prisma:seed`
- `frontend`: `npm run dev` / `build` / `preview`, `npm run lint`
- root: `npm run dev:frontend`, `npm run dev:backend`, `npm run build:frontend`, `npm run build:backend` (npm workspaces)

## Running with Docker Compose (full stack)

```bash
docker compose up --build
```

- Frontend: http://localhost:4173
- Backend API: http://localhost:4100 (health check at `/health`)
- Postgres: host port `5433`, Redis: host port `6380` (Redis is provisioned but not yet used by the API)

Note: the Compose backend service doesn't run migrations/seed automatically — run them against the container's database the same way as local dev, pointing `DATABASE_URL` at the compose Postgres instance.

## CI

`.github/workflows/ci.yml` installs dependencies and runs `npm run build` for both frontend and backend on every push/PR to `main`/`master`.

## Known gaps / not yet implemented

- No document/compliance module, audit logging is schema-only (not written to), and there's no organization/permission management UI — the schema anticipates these but the API doesn't expose them yet.
- Redis is provisioned in Compose but unused by the app.
- Single-organization only in practice today, even though the schema supports multiple.

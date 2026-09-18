[← Back to Documentation index](./README.md) · [← File Storage & Email](./08-file-storage-and-email.md)

# Frontend Architecture

> The frontend's own code wasn't touched to make the backend cutover happen —
> only its API target (`VITE_API_BASE_URL`, see §11 below) — and it now talks to
> **`fastapi-backend/`**, not the Node `backend/`. Nothing below changed as a
> result; it's documented here exactly as it was written against the Node API,
> because the frontend genuinely didn't need to change — that's the point of
> keeping the two backends' contracts identical.

## 1. Directory structure

```
frontend/
├── Dockerfile, nginx.conf         # multi-stage build → nginx static serve, see §11 below
├── index.html, vite.config.ts
├── tailwind.config.js, postcss.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example                   # VITE_API_BASE_URL=http://localhost:8100/api/v1 (only env var used)
├── .oxlintrc.json                 # oxlint (Rust-based linter) config — used instead of ESLint
└── src/
    ├── App.tsx                    # router + auth bootstrap (the router "lives" here, no separate router file)
    ├── main.tsx                   # provider tree: ThemeProvider → BrowserRouter → QueryClientProvider → App
    ├── index.css                  # Tailwind directives + HSL design-token CSS variables (light/dark)
    ├── components/
    │   ├── layout/                #   AppShell, Sidebar/MobileSidebar, Topbar, Breadcrumbs, UserMenu, ...
    │   ├── data-table/             #   generic TanStack Table wrapper (sort/filter/paginate/select)
    │   ├── charts/                 #   recharts wrappers: area/bar/donut, theme-aware tooltip/axes
    │   ├── dashboard/, employees/, departments/, leave/, profile/, reports/, settings/, audit/
    │   ├── shared/                 #   confirm-dialog (useConfirm), status-badge
    │   └── ui/                     #   shadcn/ui-style Radix + CVA primitives (button, dialog, select, table, ...)
    ├── hooks/                      # one file per domain, all TanStack Query — see §5/§6 below
    ├── lib/
    │   ├── api.ts                  #   apiFetch / authFetch — see §4 below
    │   ├── cn.ts                   #   clsx + tailwind-merge helper
    │   ├── csv.ts                  #   CSV export (employees list)
    │   └── format.ts               #   date/number formatting helpers
    ├── pages/                      # one per route, all lazy()-imported — see §3 below
    └── types/index.ts              # shared TS types mirroring backend response shapes
```

**Key dependency versions** (`package.json`): React `19.2.8`, `react-dom` `19.2.8`,
`react-router-dom` `7.18.2`, `@tanstack/react-query` `5.101.4`,
`@tanstack/react-table` `8.21.3`, `react-hook-form` `7.83.0`,
`@hookform/resolvers` `5.5.7`, `zod` `4.4.3`, Radix UI primitives (`dialog`,
`select`, `dropdown-menu`, `tabs`, `tooltip`, `alert-dialog`, `avatar`, `checkbox`,
`separator`, `popover`, `slot`), `recharts` `3.10.1` (charts), `sonner` `2.0.7`
(toasts), `lucide-react` `1.28.0` (icons), `class-variance-authority` +
`tailwind-merge` (the shadcn-style `cn()` variant pattern). Build tooling: Vite
`8.2.0`, TypeScript `~6.0.2`, `oxlint` `1.75.0`.

`vite.config.ts` is minimal — just the React plugin, no path aliases, no dev
proxy (the app calls the API's full URL directly, cross-origin, relying on the
backend's CORS config). `tsconfig.app.json` builds with `noEmit: true` (Vite does
the actual transpile; `tsc -b` in the `build` script is purely a type-check gate).

## 2. Routing

Entirely in `src/App.tsx` — no separate router file, and no `<ProtectedRoute>`
wrapper component. Instead, the whole route tree branches on auth state:

- While the initial `GET /auth/me` bootstrap check is in flight (`isAuthReady ===
  false`), nothing renders.
- **Unauthenticated** (`user === null`): only `/login` and `/signup` (both
  `lazy()`-loaded) exist; everything else redirects to `/login` (preserving the
  attempted location in router state).
- **Authenticated**: `/login`/`/signup` redirect to `/dashboard`; every other page
  is nested under a layout route rendering `<AppShell>` (sidebar + topbar +
  `<Outlet/>` inside `<Suspense>`), wrapped in `<AuthContext.Provider>`. Routes:
  `/dashboard`, `/employees`, `/employees/:id`, `/departments`,
  `/departments/:id`, `/leave`, `/notifications`, `/reports`, `/audit`,
  `/settings`, `/profile`, plus `/` and `*` both redirecting to `/dashboard`.

**There is no route-level role guard.** Role-based UI restriction happens by
*not showing* nav links for disallowed roles (`nav-items.ts` filters by
`user.role`) and by pages conditionally rendering content — but nothing stops a
`MANAGER` from typing `/reports` into the address bar; the page will render and
its data hook will fire, at which point the **backend** is what actually returns
`403`. This matches the project-wide principle that authorization is a backend
concern — see [Authorization (RBAC)](./04-authorization-rbac.md) — but it does
mean a disallowed user briefly sees a broken/empty page rather than a clean "not
allowed" redirect.

A global `window` event, `UNAUTHORIZED_EVENT` (dispatched from `lib/api.ts` when a
refresh-on-401 attempt fails), is caught in `App.tsx` to force logout + redirect
to `/login` from anywhere in the app — this is what actually fires when a session
expires mid-use, not a route guard.

## 3. Pages (`src/pages/`)

| Page | Route | Summary |
|---|---|---|
| `LoginPage` | `/login` | Plain `useState` form (not RHF/Zod — the one exception to §8's pattern), pre-filled demo credentials + "Use demo account" button, `remember` checkbox. |
| `SignupPage` | `/signup` | Same plain-state pattern, calls `POST /auth/register`. |
| `DashboardPage` | `/dashboard` | Role-aware: admins/managers get full KPIs + 4 trend charts + activity feed; plain employees get only the `PERSONAL`-scope summary (trend/activity hooks are conditionally `enabled: false` for them). |
| `EmployeesPage` | `/employees` | Full CRUD directory: `DataTable`, department/status filters in a `Sheet`, CSV export, bulk delete, `?q=` search synced with the topbar search box. `canManage` (SUPER_ADMIN/HR_ADMIN) gates add/edit/delete. |
| `EmployeeDetailPage` | `/employees/:id` | One employee + their leave history, tabbed (Overview/Personal/Employment/Leave History/Documents/Activity/Notes — **the last three tabs are UI placeholders, not wired to real data**). |
| `DepartmentsPage` | `/departments` | Grid of department cards; delete is SUPER_ADMIN-only, create/edit is SUPER_ADMIN/HR_ADMIN. |
| `DepartmentDetailPage` | `/departments/:id` | One department + its employees (filtered client-side from the full employee list); includes a stated placeholder stat ("open positions — not tracked yet"). |
| `LeavePage` | `/leave` | Stat cards + List/Calendar tabs; approve/reject/cancel actions inline; `canDecide` = SUPER_ADMIN/HR_ADMIN/MANAGER. |
| `NotificationsPage` | `/notifications` | Notifications grouped client-side into Today/Yesterday/Earlier; per-item and mark-all-read actions. |
| `ReportsPage` | `/reports` | Four donut-chart cards from the one `/reports/summary` call. |
| `AuditLogPage` | `/audit` | Audit trail table (up to 100 rows), formatted actor/action/entity/metadata columns. |
| `SettingsPage` | `/settings` | Appearance (theme toggle, anyone) + organization name edit (SUPER_ADMIN only). |
| `ProfilePage` | `/profile` | Own employee record, same tab layout as the detail page but the Personal tab is editable here. |

## 4. API layer — `src/lib/api.ts`

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_KEY = 'corehr-access-token';
export const UNAUTHORIZED_EVENT = 'corehr:unauthorized';
```

That in-code fallback (`4000`, the Node backend's local dev port) is untouched —
it's just the last resort if `VITE_API_BASE_URL` is unset. It isn't unset in
practice: `frontend/.env`, `frontend/.env.example`, and `frontend/Dockerfile`'s
build-time default all now point at `http://localhost:8100/api/v1` —
`fastapi-backend`'s port, both for local Vite dev and Docker Compose.

- **Token storage**: only the **access** token is kept in the browser
  (`localStorage` if "remember me" was checked, `sessionStorage` otherwise,
  `getAccessToken()` checks both). The refresh token is never touched by
  JavaScript — it's the backend's `httpOnly` cookie (see
  [Authentication](./03-authentication.md)), which is why every fetch call sets
  `credentials: 'include'`.
- **`apiFetch<T>()`** — unauthenticated helper (used only for
  login/register/refresh/logout): JSON headers, throws a plain `Error(message)`
  parsed from the backend's error body on any non-OK response.
- **`authFetch<T>()`** — the one every domain hook uses: attaches
  `Authorization: Bearer <token>`; on a `401` it calls `tryRefreshAccessToken()`
  (`POST /auth/refresh` via `apiFetch`) and, if that succeeds, **retries the
  original request once** with the new token; if refresh fails, it clears both
  token stores, dispatches `UNAUTHORIZED_EVENT`, and throws `"Session expired.
  Please sign in again."` — this is the single mechanism behind "you got logged
  out silently after your token expired."

## 5. State management

- **Auth** — `src/hooks/useAuth.tsx` defines only the context/hook
  (`useAuth()` throws if called outside a provider); the actual `AuthContext.Provider`
  lives in `App.tsx`, which owns `user`/`isAuthReady` state, the `/auth/me`
  bootstrap effect, and `handleLogin`/`handleSignup`/`logout`. Because the
  provider only wraps the *authenticated* route tree, `useAuth()` is safe to call
  from any page under `AppShell` — `user` is guaranteed non-null there.
- **Theme** — `src/hooks/useTheme.tsx`, a separate context wrapping the *entire*
  app (outside the router, in `main.tsx`). Persists to `localStorage`
  (`corehr-theme`), defaults to the `prefers-color-scheme` media query on first
  load, toggles a `.dark` class on `<html>`.
- **Server state** — `main.tsx` creates one `new QueryClient()` with **no custom
  `defaultOptions`** — all TanStack Query defaults apply (5s implicit staleness
  handling via `useQuery` defaults, refetch-on-window-focus on, etc.), except
  `useMyProfile()` which sets `retry: false`. No devtools package installed.
- **Misc local state**: sidebar collapse (`corehr-sidebar-collapsed` in
  `localStorage`, managed as component state in `AppShell`, not context); toasts
  via `sonner`'s imperative `toast.success()`/`toast.error()` API (one `<Toaster/>`
  mounted globally in `main.tsx`, no context needed to use it).

## 6. Custom hooks (`src/hooks/`)

Every list/detail/mutation hook follows the same shape: `useX()` for a list,
`useX(id)` for a detail (`enabled: !!id`), `useCreateX`/`useUpdateX`/`useDeleteX`
mutations that `invalidateQueries` the relevant keys (and `dashboard`/
`notifications` too, where the mutation affects those numbers) on success.

| Hook file | Exports | Backend calls |
|---|---|---|
| `useEmployees.ts` | `useEmployees`, `useEmployee(id)`, `useCreateEmployee`, `useUpdateEmployee`, `useDeleteEmployee` | `GET/POST/PATCH/DELETE /employees[/:id]` |
| `useDepartments.ts` | `useDepartments`, `useDepartment(id)`, `useCreateDepartment`, `useUpdateDepartment`, `useDeleteDepartment` | `GET/POST/PATCH/DELETE /departments[/:id]` |
| `useLeave.ts` | `useLeaveRequests(employeeId?)`, `useCreateLeaveRequest`, `useApproveLeaveRequest`, `useRejectLeaveRequest`, `useCancelLeaveRequest` | `GET/POST /leave`, `PATCH /leave/:id/{approve,reject,cancel}` |
| `useDashboard.ts` | `useDashboardSummary`, `useDashboardTrends(enabled)`, `useDashboardActivity(enabled)` | `GET /dashboard/{summary,trends,activity}` |
| `useNotifications.ts` | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` | `GET /notifications`, `PATCH /notifications/{:id/read,read-all}` |
| `useOrganization.ts` | `useOrganization`, `useUpdateOrganization` | `GET/PATCH /organization` |
| `useProfile.ts` | `useMyProfile` (`retry: false`), `useUpdateMyProfile` | `GET/PATCH /employees/me` |
| `useReports.ts` | `useReportsSummary` | `GET /reports/summary` |
| `useAudit.ts` | `useAuditLog` | `GET /audit?pageSize=100` |
| `useTheme.tsx` | `useTheme`, `ThemeProvider` | n/a (localStorage) |
| `useAuth.tsx` | `useAuth`, `AuthContext` | n/a (context; provider lives in `App.tsx`) |

(`useConfirm()` — a promise-based confirmation-dialog hook — is colocated with
its UI in `components/shared/confirm-dialog.tsx` rather than in `hooks/`.)

## 7. Types (`src/types/index.ts`)

Mirrors the backend's response shapes: `AppUser`, `UserRole`, `EmploymentStatus`,
`Department` (incl. resolved `employeeCount`/`manager`), `Employee` (incl. nested
`department`), `LeaveStatus`, `LeaveRequest` (incl. nested `employee` summary),
`Notification`, `Organization`, `AuditLogEntry`/`AuditLogResponse`. Two notably
precise ones:

- `DashboardSummary` is a **discriminated union on `scope`** — `'ORGANIZATION'`
  (totalEmployees, activeEmployees, departmentsCount, pending/approved/rejected
  leave counts, newEmployees, departmentBreakdown[]) vs. `'PERSONAL'`
  (myPendingLeaveRequests, myApprovedLeaveRequests, unreadNotifications) — matching
  the backend's role-branching in `dashboard_service.get_summary`.
- `ApiResponse<T> = { success: boolean; data: T }` — the generic envelope every
  hook unwraps.

Form-input types (`EmployeeFormInput`, `DepartmentInput`, `LeaveRequestInput`,
`ProfileUpdateInput`) live next to their Zod schemas in the relevant hook files,
not in `types/index.ts`.

## 8. Forms & validation (React Hook Form + Zod)

The standard pattern: a `zod` schema → `z.infer` type → `useForm({ resolver:
zodResolver(schema), values })` → `register`/`Controller` (for Radix `Select`,
which isn't a native input) → `handleSubmit` → a mutation's `.mutateAsync()` with
`toast.success`/`toast.error`. Field errors render through the shared
`<FormField label htmlFor error>` component.

Representative example — **leave request** (`components/leave/leave-request-dialog.tsx`),
which shows cross-field validation via `.refine()`:
```ts
const leaveFormSchema = z
  .object({
    leaveType: z.string().min(2, 'Leave type is required').max(80),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(2, 'Reason is required').max(500),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });
```

The **employee form** (`components/employees/employee-form-dialog.tsx`) is the
other notable one: it uses `values:` rather than `defaultValues:` on `useForm` so
the same dialog re-syncs correctly whether it's creating or editing (the editing
target can change while the dialog stays mounted), and uses a sentinel string
(`'__unassigned__'`) to represent "no department" in the `Select` since Radix's
`Select` can't hold an empty-string value — converted back to `null` on submit.

**Two deliberate exceptions to this pattern**: `LoginPage`/`SignupPage` (plain
`useState`, no client-side schema — see §3 above) and the Profile page's
**Personal** tab (`components/profile/personal-tab.tsx`), which is a hand-rolled
edit-toggle form with local `useState` synced via `useEffect`, not RHF/Zod at all.

## 9. Components (`src/components/`)

- **`layout/`** — `app-shell.tsx` (the authenticated shell), `sidebar.tsx` /
  `mobile-sidebar.tsx` (both filtered by `user.role` via `nav-items.ts`),
  `topbar.tsx` (breadcrumbs + search + theme toggle + notification bell + user
  menu), `notification-bell.tsx` (dropdown preview of the latest 5), `user-menu.tsx`.
- **`data-table/`** — a generic, reusable TanStack Table wrapper
  (`data-table.tsx`) plus a sortable column header, pagination controls, a
  row-actions dropdown, and a toolbar (search + column visibility). Domain
  screens supply column definitions via factory functions —
  `buildEmployeeColumns`, `buildLeaveColumns`, `auditColumns`.
- **`charts/`** — thin `recharts` wrappers (`ChartContainer`, a themed tooltip,
  and area/bar/donut chart components) driving the dashboard's 4 trend/
  distribution visualizations.
- **`ui/`** — a shadcn/ui-style primitive set (Radix UI + `class-variance-authority`
  variants + Tailwind): button, dialog, select, dropdown-menu, tabs, table, card,
  badge, tooltip, sheet, skeleton, stat-card, empty-state, error-banner,
  form-field, and more.
- **`shared/confirm-dialog.tsx`** — exports `useConfirm()`, a promise-based
  imperative confirmation pattern (`await confirm({...})` resolves to a boolean)
  built on the `AlertDialog` primitive.
- **`shared/status-badge.tsx`** — `EmploymentStatusBadge`/`LeaveStatusBadge`,
  mapping enum values to badge colors (e.g. `ACTIVE→success`,
  `TERMINATED→destructive`, `PENDING→warning`).
- **Domain folders** (`dashboard/`, `employees/`, `departments/`, `leave/`,
  `profile/`, `reports/`, `settings/`, `audit/`) hold the composed,
  page-specific pieces (dialogs, tabs, cards) built from the above primitives.
  Notable stubs: `profile/documents-tab.tsx`, `activity-tab.tsx`, `notes-tab.tsx`
  each just render an `EmptyState` — not wired to any real data or endpoint.

## 10. Styling

Tailwind CSS with `darkMode: 'class'` (a `.dark` class on `<html>`, toggled by
`ThemeProvider`, not a live `prefers-color-scheme` media query — that's only
consulted once, for the initial default). All colors are indirected through HSL
CSS custom properties declared in `src/index.css` (`:root` for light, `.dark` for
overrides) and exposed to Tailwind via `theme.extend.colors` using
`hsl(var(--x) / <alpha-value>)` — the standard shadcn/ui design-token pattern.
Tokens include `background`, `foreground`, `card`, `popover`, `primary`,
`secondary`, `muted`, `accent`, `success`, `warning`, `destructive`, `border`,
`input`, `ring`, and four `chart-N` colors for data viz. Font is a self-hosted
`@fontsource-variable/inter`. No CSS-in-JS.

## 11. Build & deploy

`frontend/Dockerfile` — two stages: `node:20-alpine` builds the app (`npm
install`, `npm run build`, with `VITE_API_BASE_URL` baked in as a build
ARG/ENV — **the API URL is fixed at image-build time, not configurable at
container runtime**), then `nginx:1.27-alpine` serves the static `dist/` output
on port 80. `nginx.conf` is a single minimal server block:
```nginx
location / { try_files $uri $uri/ /index.html; }
```
This is the SPA fallback — any path that isn't a real static file (e.g.
`/employees/123` on a hard refresh) falls through to `index.html`, letting React
Router's client-side routing take over. There's no API reverse-proxy or rewrite
rule here — the frontend calls `VITE_API_BASE_URL` directly, cross-origin, so CORS
must be (and is) handled entirely by the backend.

---

[← File Storage & Email](./08-file-storage-and-email.md) · Next: [Legacy Node Backend →](./10-legacy-node-backend.md)

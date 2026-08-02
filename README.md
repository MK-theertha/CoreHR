# CoreHR - Employee Management and Compliance Platform

CoreHR is an enterprise-grade workforce management system built for organizations that need secure employee administration, document compliance, approvals, and analytics in a single platform.

## Architecture

This repository is organized as a monorepo:

- `frontend/`: React + Vite + TypeScript + Tailwind UI
- `backend/`: Express + TypeScript + Prisma + PostgreSQL API
- `docker/`: deployment assets and compose files
- `.github/workflows/`: CI/CD pipeline

## Database Schema

Core entities and relationships include:

- Organization
- Department
- Team
- User
- Role
- Permission
- Employee
- Document
- LeaveRequest
- Notification
- AuditLog
- RefreshToken

The schema is designed around multi-tenant organization boundaries, auditability, and role-based access control.

## API Structure

The backend exposes REST endpoints grouped by domain:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/organizations`
- `/api/v1/departments`
- `/api/v1/employees`
- `/api/v1/documents`
- `/api/v1/leave-requests`
- `/api/v1/dashboard`
- `/api/v1/notifications`
- `/api/v1/audit-logs`

Each route is protected with middleware for authentication, validation, logging, and RBAC.

## Implementation Phases

1. Foundation and architecture
2. Authentication and user roles
3. Employee management
4. Document compliance
5. Leave management
6. Dashboard and analytics
7. Notifications and audit logs
8. Docker and CI/CD pipeline

## Current Status

This repository begins with the foundation for the platform, including:

- project structure
- backend configuration
- auth and RBAC skeleton
- employee module skeleton
- frontend dashboard shell

The implementation is intentionally incremental and designed for production readiness as the platform evolves.

## Running with Docker

Use Docker Compose to start the full stack without clashing with any local dev ports already bound on the machine:

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:4173
- Backend API: http://localhost:4100
- Health check: http://localhost:4100/health

The Compose setup exposes PostgreSQL on 5433 and Redis on 6380 on the host to avoid conflicts with existing local services.

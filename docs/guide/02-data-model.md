[← Back to Documentation index](./README.md) · [← Overview](./01-overview.md)

# Data Model

Both backends implement the **same logical schema** (the FastAPI SQLAlchemy models
in `fastapi-backend/app/db/models.py` were written to mirror
`backend/prisma/schema.prisma` exactly, table-for-table and column-for-column,
including matching Postgres constraint names). Table names are `PascalCase`
(quoted identifiers), columns are `camelCase` in the actual database even though
Python/SQLAlchemy attribute names are `snake_case`.

## Entities

**Organization** — top-level tenant. Every Department/User/Employee optionally
belongs to one. Only one is ever seeded in practice.
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| slug | string | unique |
| createdAt, updatedAt | timestamp | |

**User** — a login identity (not the same row as an Employee).
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| email | string | unique |
| passwordHash | string | bcrypt, 10 rounds |
| role | enum `RoleName` | `SUPER_ADMIN` \| `HR_ADMIN` \| `MANAGER` \| `EMPLOYEE`, default `EMPLOYEE` |
| organizationId | string? | FK → Organization, `ON DELETE SET NULL` |
| createdAt, updatedAt | timestamp | |

**Department**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| name | string | |
| organizationId | string | FK → Organization, `ON DELETE RESTRICT` (not nullable) |
| createdAt | timestamp | |

**Employee** — the HR record. Optionally linked 1:1 to a User (for self-service login).
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| fullName | string | |
| email | string | unique |
| phone, gender, jobTitle | string? | |
| dateOfBirth, joiningDate | timestamp? | |
| departmentId | string? | FK → Department, `ON DELETE SET NULL` |
| status | enum `EmploymentStatus` | `ACTIVE` \| `PROBATION` \| `INACTIVE` \| `TERMINATED`, default `ACTIVE` |
| profileImage | string? | **S3 object key** (not a URL — see [File Storage & Email](./08-file-storage-and-email.md)) |
| organizationId | string? | FK → Organization, `ON DELETE SET NULL` |
| userId | string? | FK → User, unique, `ON DELETE SET NULL` |
| createdAt, updatedAt | timestamp | |

**LeaveRequest**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| employeeId | string | FK → Employee, `ON DELETE RESTRICT` |
| leaveType | string | free text (e.g. "Sick", "Vacation") |
| startDate, endDate | timestamp | |
| reason | string | |
| status | enum `LeaveStatus` | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`, default `PENDING` |
| approvedBy | string? | FK → User, `ON DELETE SET NULL` — who decided it |
| comments | string? | decision comment |
| createdAt, updatedAt | timestamp | |

**Notification**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| title, message, type | string | `type` is currently always `"LEAVE"` in practice |
| isRead | boolean | default `false` |
| userId | string? | FK → User, `ON DELETE SET NULL` — recipient |
| createdAt | timestamp | |

**AuditLog**
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| userId | string? | FK → User, `ON DELETE SET NULL` — actor |
| action | string | e.g. `EMPLOYEE_CREATED`, `LEAVE_APPROVED`, `USER_ROLE_CHANGED` |
| entityType, entityId | string? | what was acted on |
| timestamp | timestamp | |
| ipAddress | string? | |
| metadata | JSONB | free-form details (e.g. `{"changes": {...}}`) |

Indexed on `(entityType, entityId)` and `userId`.

**Document** — employee documents and leave-request attachments (see
[File Storage & Email](./08-file-storage-and-email.md)). Polymorphic association,
same `(entityType, entityId)` pattern as AuditLog, rather than two near-identical
tables — one Document row per uploaded file.
| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | PK |
| entityType | string | `"Employee"` \| `"LeaveRequest"` |
| entityId | string | the Employee or LeaveRequest this file belongs to |
| fileName | string | original filename, display-only |
| contentType | string | one of a fixed allowlist — see File Storage & Email |
| sizeBytes | bigint? | not currently populated (nothing computes it yet) |
| s3Key | string | the actual S3 object key — never exposed directly, only via a fresh pre-signed URL |
| uploadedBy | string? | FK → User, `ON DELETE SET NULL` |
| createdAt | timestamp | |

Indexed on `(entityType, entityId)`. Added in migration `b86b3869e795_add_document_table.py`.

## Relationships (at a glance)

```
Organization 1───* User
Organization 1───* Department
Organization 1───* Employee

Department   1───* Employee

User         1───1 Employee        (User.id ← Employee.userId, optional)
User         1───* Notification    (recipient)
User         1───* LeaveRequest    (as approver, via approvedBy)
User         1───* AuditLog        (as actor)

Employee     1───* LeaveRequest

User         1───* Document        (as uploader, optional)
Employee     1───* Document        (entityType="Employee")
LeaveRequest 1───* Document        (entityType="LeaveRequest")
```

A `User` is a login credential; an `Employee` is an HR record. They're linked but
distinct — an Employee can exist with no linked User (not yet invited to
self-service), and (in principle) a User could exist with no Employee (an
admin-only account). Registration (`POST /auth/register`) always creates a `User`
with role `EMPLOYEE`, and either links it to an existing `Employee` row matching
the email or creates a new bare-minimum `Employee` row for it.

## FastAPI's Alembic migrations

`fastapi-backend/alembic/versions/1117969025a6_initial_schema.py` is a single,
hand-written baseline migration — not autogenerated — because it was adopted
*after* the FastAPI backend's dev database already existed (bootstrapped by
hand-applying the Node backend's Prisma SQL). It was written to produce **exactly**
the schema above (minus Document) from scratch (enums, tables, FKs with names
matching what Postgres already assigned, indexes), verified by running it
against a disposable database and confirming `alembic check` reports zero drift
against the SQLAlchemy models. The existing local dev database was
`alembic stamp head`-ed (marked as already migrated) rather than replayed, since
its schema already matched.

A second migration, `b86b3869e795_add_document_table.py`, adds just the
`Document` table on top of that baseline. It was generated with
`alembic revision --autogenerate` and then hand-trimmed: autogenerate also
picked up the baseline-vs-legacy-DB cosmetic drift described above (running it
against the hand-bootstrapped local dev DB, not a DB created purely by this
migration chain) — that noise was stripped, keeping only the actual new-table
operations. Same verification as the baseline: clean round-trip
(upgrade → `alembic check` reports zero drift → downgrade) against a disposable
database.

Neither of the four features added most recently (email notifications, CSV
export, refresh-token revocation, expanded test coverage) needed a schema
change — token versioning and rate limiting live entirely in Redis, and
email/CSV are stateless.

---

[← Overview](./01-overview.md) · Next: [Authentication →](./03-authentication.md)

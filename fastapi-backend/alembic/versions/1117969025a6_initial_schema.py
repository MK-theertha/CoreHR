"""initial schema

Baseline migration mirroring the final state of the legacy Prisma schema
(backend/prisma/migrations/*), collapsed to one revision since Alembic is
adopted after the fact and doesn't need to replay Prisma's own history
(e.g. the dropped Role table). Column-for-column equivalent to
app/db/models.py.

Revision ID: 1117969025a6
Revises:
Create Date: 2026-09-01 08:28:40.947227

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1117969025a6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

role_name_enum = postgresql.ENUM(
    "SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE", name="RoleName", create_type=False
)
employment_status_enum = postgresql.ENUM(
    "ACTIVE", "PROBATION", "INACTIVE", "TERMINATED", name="EmploymentStatus", create_type=False
)
leave_status_enum = postgresql.ENUM(
    "PENDING", "APPROVED", "REJECTED", "CANCELLED", name="LeaveStatus", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE TYPE \"RoleName\" AS ENUM ('SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE')")
    op.execute("CREATE TYPE \"EmploymentStatus\" AS ENUM ('ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED')")
    op.execute("CREATE TYPE \"LeaveStatus\" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')")

    op.create_table(
        "Organization",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("slug", name="Organization_slug_key"),
    )

    op.create_table(
        "User",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("passwordHash", sa.String(), nullable=False),
        sa.Column("role", role_name_enum, nullable=False, server_default="EMPLOYEE"),
        sa.Column(
            "organizationId",
            sa.String(),
            sa.ForeignKey("Organization.id", ondelete="SET NULL", name="User_organizationId_fkey"),
            nullable=True,
        ),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("email", name="User_email_key"),
    )

    op.create_table(
        "Department",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "organizationId",
            sa.String(),
            sa.ForeignKey("Organization.id", ondelete="RESTRICT", name="Department_organizationId_fkey"),
            nullable=False,
        ),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "Employee",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("fullName", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("dateOfBirth", sa.DateTime(), nullable=True),
        sa.Column("gender", sa.String(), nullable=True),
        sa.Column("jobTitle", sa.String(), nullable=True),
        sa.Column(
            "departmentId",
            sa.String(),
            sa.ForeignKey("Department.id", ondelete="SET NULL", name="Employee_departmentId_fkey"),
            nullable=True,
        ),
        sa.Column("joiningDate", sa.DateTime(), nullable=True),
        sa.Column("status", employment_status_enum, nullable=False, server_default="ACTIVE"),
        sa.Column("profileImage", sa.String(), nullable=True),
        sa.Column(
            "organizationId",
            sa.String(),
            sa.ForeignKey("Organization.id", ondelete="SET NULL", name="Employee_organizationId_fkey"),
            nullable=True,
        ),
        sa.Column(
            "userId",
            sa.String(),
            sa.ForeignKey("User.id", ondelete="SET NULL", name="Employee_userId_fkey"),
            nullable=True,
        ),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("email", name="Employee_email_key"),
        sa.UniqueConstraint("userId", name="Employee_userId_key"),
    )

    op.create_table(
        "LeaveRequest",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "employeeId",
            sa.String(),
            sa.ForeignKey("Employee.id", ondelete="RESTRICT", name="LeaveRequest_employeeId_fkey"),
            nullable=False,
        ),
        sa.Column("leaveType", sa.String(), nullable=False),
        sa.Column("startDate", sa.DateTime(), nullable=False),
        sa.Column("endDate", sa.DateTime(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("status", leave_status_enum, nullable=False, server_default="PENDING"),
        sa.Column(
            "approvedBy",
            sa.String(),
            sa.ForeignKey("User.id", ondelete="SET NULL", name="LeaveRequest_approvedBy_fkey"),
            nullable=True,
        ),
        sa.Column("comments", sa.String(), nullable=True),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
        sa.Column("updatedAt", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "Notification",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("isRead", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "userId",
            sa.String(),
            sa.ForeignKey("User.id", ondelete="SET NULL", name="Notification_userId_fkey"),
            nullable=True,
        ),
        sa.Column("createdAt", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "AuditLog",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "userId",
            sa.String(),
            sa.ForeignKey("User.id", ondelete="SET NULL", name="AuditLog_userId_fkey"),
            nullable=True,
        ),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entityType", sa.String(), nullable=True),
        sa.Column("entityId", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("ipAddress", sa.String(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
    )
    op.create_index("AuditLog_entityType_entityId_idx", "AuditLog", ["entityType", "entityId"])
    op.create_index("AuditLog_userId_idx", "AuditLog", ["userId"])


def downgrade() -> None:
    op.drop_table("AuditLog")
    op.drop_table("Notification")
    op.drop_table("LeaveRequest")
    op.drop_table("Employee")
    op.drop_table("Department")
    op.drop_table("User")
    op.drop_table("Organization")

    op.execute('DROP TYPE "LeaveStatus"')
    op.execute('DROP TYPE "EmploymentStatus"')
    op.execute('DROP TYPE "RoleName"')

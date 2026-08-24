from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import new_cuid
from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


RoleNameEnum = ENUM("SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE", name="RoleName", create_type=False)
EmploymentStatusEnum = ENUM(
    "ACTIVE", "PROBATION", "INACTIVE", "TERMINATED", name="EmploymentStatus", create_type=False
)
LeaveStatusEnum = ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED", name="LeaveStatus", create_type=False)


class Organization(Base):
    __tablename__ = "Organization"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime, default=_utcnow, onupdate=_utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    employees: Mapped[list["Employee"]] = relationship(back_populates="organization")
    departments: Mapped[list["Department"]] = relationship(back_populates="organization")


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column("passwordHash", String, nullable=False)
    role: Mapped[str] = mapped_column(RoleNameEnum, nullable=False, server_default="EMPLOYEE")
    organization_id: Mapped[str | None] = mapped_column(
        "organizationId", String, ForeignKey("Organization.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime, default=_utcnow, onupdate=_utcnow)

    organization: Mapped["Organization | None"] = relationship(back_populates="users")
    employee: Mapped["Employee | None"] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    approved_leaves: Mapped[list["LeaveRequest"]] = relationship(back_populates="approver")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")


class Department(Base):
    __tablename__ = "Department"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    organization_id: Mapped[str] = mapped_column(
        "organizationId", String, ForeignKey("Organization.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="departments")
    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Employee(Base):
    __tablename__ = "Employee"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    full_name: Mapped[str] = mapped_column("fullName", String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column("dateOfBirth", DateTime, nullable=True)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    job_title: Mapped[str | None] = mapped_column("jobTitle", String, nullable=True)
    department_id: Mapped[str | None] = mapped_column(
        "departmentId", String, ForeignKey("Department.id", ondelete="SET NULL"), nullable=True
    )
    joining_date: Mapped[datetime | None] = mapped_column("joiningDate", DateTime, nullable=True)
    status: Mapped[str] = mapped_column(EmploymentStatusEnum, nullable=False, server_default="ACTIVE")
    profile_image: Mapped[str | None] = mapped_column("profileImage", String, nullable=True)
    organization_id: Mapped[str | None] = mapped_column(
        "organizationId", String, ForeignKey("Organization.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[str | None] = mapped_column(
        "userId", String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime, default=_utcnow, onupdate=_utcnow)

    organization: Mapped["Organization | None"] = relationship(back_populates="employees")
    department: Mapped["Department | None"] = relationship(back_populates="employees")
    user: Mapped["User | None"] = relationship(back_populates="employee")
    leave_requests: Mapped[list["LeaveRequest"]] = relationship(back_populates="employee")


class LeaveRequest(Base):
    __tablename__ = "LeaveRequest"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    employee_id: Mapped[str] = mapped_column(
        "employeeId", String, ForeignKey("Employee.id", ondelete="RESTRICT"), nullable=False
    )
    leave_type: Mapped[str] = mapped_column("leaveType", String, nullable=False)
    start_date: Mapped[datetime] = mapped_column("startDate", DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column("endDate", DateTime, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(LeaveStatusEnum, nullable=False, server_default="PENDING")
    approved_by: Mapped[str | None] = mapped_column(
        "approvedBy", String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True
    )
    comments: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime, default=_utcnow, onupdate=_utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="leave_requests")
    approver: Mapped["User | None"] = relationship(back_populates="approved_leaves")


class Notification(Base):
    __tablename__ = "Notification"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    is_read: Mapped[bool] = mapped_column("isRead", Boolean, nullable=False, server_default="false")
    user_id: Mapped[str | None] = mapped_column(
        "userId", String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())

    user: Mapped["User | None"] = relationship(back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "AuditLog"
    __table_args__ = (
        Index("AuditLog_entityType_entityId_idx", "entityType", "entityId"),
        Index("AuditLog_userId_idx", "userId"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_cuid)
    user_id: Mapped[str | None] = mapped_column(
        "userId", String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str | None] = mapped_column("entityType", String, nullable=True)
    entity_id: Mapped[str | None] = mapped_column("entityId", String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ip_address: Mapped[str | None] = mapped_column("ipAddress", String, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")

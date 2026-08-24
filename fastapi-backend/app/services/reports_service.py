from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Department, Employee, LeaveRequest, User


async def _department_breakdown(db: AsyncSession) -> list[dict]:
    rows = (
        await db.execute(
            select(Department.name, func.count(Employee.id))
            .select_from(Department)
            .outerjoin(Employee, Employee.department_id == Department.id)
            .group_by(Department.id, Department.name)
            .order_by(Department.name.asc())
        )
    ).all()
    return [{"name": name, "employeeCount": count} for name, count in rows]


async def _employees_by_status(db: AsyncSession) -> list[dict]:
    rows = (
        await db.execute(select(Employee.status, func.count()).group_by(Employee.status))
    ).all()
    return [{"status": status, "count": count} for status, count in rows]


async def _leave_requests_by_status(db: AsyncSession) -> list[dict]:
    rows = (
        await db.execute(select(LeaveRequest.status, func.count()).group_by(LeaveRequest.status))
    ).all()
    return [{"status": status, "count": count} for status, count in rows]


async def _users_by_role(db: AsyncSession) -> list[dict]:
    rows = (
        await db.execute(select(User.role, func.count()).group_by(User.role))
    ).all()
    return [{"role": role, "count": count} for role, count in rows]


async def get_summary(db: AsyncSession) -> dict:
    return {
        "departmentBreakdown": await _department_breakdown(db),
        "employeesByStatus": await _employees_by_status(db),
        "leaveRequestsByStatus": await _leave_requests_by_status(db),
        "usersByRole": await _users_by_role(db),
    }

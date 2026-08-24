from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Department, Employee, LeaveRequest, Notification
from app.deps import CurrentUser

CAN_VIEW_ORG_STATS = {"SUPER_ADMIN", "HR_ADMIN", "MANAGER"}
MONTHS_BACK = 11


async def get_summary(db: AsyncSession, user: CurrentUser) -> dict:
    if user.role in CAN_VIEW_ORG_STATS:
        return await _org_summary(db)
    return await _personal_summary(db, user)


async def _org_summary(db: AsyncSession) -> dict:
    thirty_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)

    total_employees = (await db.execute(select(func.count()).select_from(Employee))).scalar_one()
    active_employees = (
        await db.execute(select(func.count()).select_from(Employee).where(Employee.status == "ACTIVE"))
    ).scalar_one()
    pending = (
        await db.execute(select(func.count()).select_from(LeaveRequest).where(LeaveRequest.status == "PENDING"))
    ).scalar_one()
    approved = (
        await db.execute(select(func.count()).select_from(LeaveRequest).where(LeaveRequest.status == "APPROVED"))
    ).scalar_one()
    rejected = (
        await db.execute(select(func.count()).select_from(LeaveRequest).where(LeaveRequest.status == "REJECTED"))
    ).scalar_one()
    new_employees = (
        await db.execute(select(func.count()).select_from(Employee).where(Employee.created_at >= thirty_days_ago))
    ).scalar_one()

    departments = (await db.execute(select(Department).order_by(Department.name.asc()))).scalars().all()
    department_breakdown = []
    for department in departments:
        count = (
            await db.execute(
                select(func.count()).select_from(Employee).where(Employee.department_id == department.id)
            )
        ).scalar_one()
        department_breakdown.append({"name": department.name, "employeeCount": count})

    return {
        "scope": "ORGANIZATION",
        "totalEmployees": total_employees,
        "activeEmployees": active_employees,
        "departmentsCount": len(departments),
        "pendingLeaveRequests": pending,
        "approvedLeaveRequests": approved,
        "rejectedLeaveRequests": rejected,
        "newEmployees": new_employees,
        "departmentBreakdown": department_breakdown,
    }


async def _personal_summary(db: AsyncSession, user: CurrentUser) -> dict:
    employee = (await db.execute(select(Employee).where(Employee.user_id == user.id))).scalar_one_or_none()
    if employee is None:
        return {"scope": "PERSONAL", "myPendingLeaveRequests": 0, "myApprovedLeaveRequests": 0, "unreadNotifications": 0}

    my_pending = (
        await db.execute(
            select(func.count())
            .select_from(LeaveRequest)
            .where(LeaveRequest.employee_id == employee.id, LeaveRequest.status == "PENDING")
        )
    ).scalar_one()
    my_approved = (
        await db.execute(
            select(func.count())
            .select_from(LeaveRequest)
            .where(LeaveRequest.employee_id == employee.id, LeaveRequest.status == "APPROVED")
        )
    ).scalar_one()
    unread_notifications = (
        await db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        )
    ).scalar_one()

    return {
        "scope": "PERSONAL",
        "myPendingLeaveRequests": my_pending,
        "myApprovedLeaveRequests": my_approved,
        "unreadNotifications": unread_notifications,
    }


def _month_buckets() -> list[tuple[str, str, datetime]]:
    now = datetime.now(timezone.utc)
    start_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    buckets = []
    for offset in range(MONTHS_BACK, -1, -1):
        year = start_of_current_month.year
        month = start_of_current_month.month - offset
        while month <= 0:
            month += 12
            year -= 1
        bucket_date = datetime(year, month, 1)
        key = bucket_date.strftime("%Y-%m")
        label = f"{bucket_date.strftime('%b')} {bucket_date.strftime('%y')}"
        buckets.append((key, label, bucket_date))
    return buckets


def _since(buckets: list[tuple[str, str, datetime]]) -> datetime:
    return buckets[0][2]


async def get_trends(db: AsyncSession) -> dict:
    buckets = _month_buckets()
    since = _since(buckets)

    growth_rows = (
        await db.execute(
            text(
                """
                SELECT date_trunc('month', "createdAt") AS month, COUNT(*) AS count
                FROM "Employee"
                WHERE "createdAt" >= :since
                GROUP BY month
                """
            ),
            {"since": since},
        )
    ).all()
    growth_by_month = {row.month.strftime("%Y-%m"): row.count for row in growth_rows}

    hiring_rows = (
        await db.execute(
            text(
                """
                SELECT date_trunc('month', "joiningDate") AS month, COUNT(*) AS count
                FROM "Employee"
                WHERE "joiningDate" IS NOT NULL AND "joiningDate" >= :since
                GROUP BY month
                """
            ),
            {"since": since},
        )
    ).all()
    hiring_by_month = {row.month.strftime("%Y-%m"): row.count for row in hiring_rows}

    leave_rows = (
        await db.execute(
            text(
                """
                SELECT date_trunc('month', "createdAt") AS month, status, COUNT(*) AS count
                FROM "LeaveRequest"
                WHERE "createdAt" >= :since
                GROUP BY month, status
                """
            ),
            {"since": since},
        )
    ).all()
    leave_by_month: dict[str, dict[str, int]] = {}
    for row in leave_rows:
        key = row.month.strftime("%Y-%m")
        leave_by_month.setdefault(key, {})[row.status] = row.count

    employee_growth = [{"month": label, "count": growth_by_month.get(key, 0)} for key, label, _ in buckets]
    monthly_hiring = [{"month": label, "count": hiring_by_month.get(key, 0)} for key, label, _ in buckets]
    leave_trends = [
        {
            "month": label,
            "PENDING": leave_by_month.get(key, {}).get("PENDING", 0),
            "APPROVED": leave_by_month.get(key, {}).get("APPROVED", 0),
            "REJECTED": leave_by_month.get(key, {}).get("REJECTED", 0),
            "CANCELLED": leave_by_month.get(key, {}).get("CANCELLED", 0),
        }
        for key, label, _ in buckets
    ]

    return {"employeeGrowth": employee_growth, "monthlyHiring": monthly_hiring, "leaveTrends": leave_trends}


async def get_activity(db: AsyncSession) -> list[dict]:
    decisions = (
        (
            await db.execute(
                select(LeaveRequest)
                .where(LeaveRequest.status.in_(["APPROVED", "REJECTED"]))
                .order_by(LeaveRequest.updated_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )
    new_hires = (await db.execute(select(Employee).order_by(Employee.created_at.desc()).limit(10))).scalars().all()

    items = [
        {
            "id": f"leave-{leave.id}",
            "type": "LEAVE_DECISION",
            "message": f"{leave.employee.full_name}'s {leave.leave_type.lower()} request was {leave.status.lower()}",
            "timestamp": leave.updated_at,
        }
        for leave in decisions
    ]
    items += [
        {
            "id": f"employee-{employee.id}",
            "type": "EMPLOYEE_CREATED",
            "message": f"{employee.full_name} joined the organization",
            "timestamp": employee.created_at,
        }
        for employee in new_hires
    ]

    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items[:15]

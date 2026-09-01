import json
import logging
from datetime import datetime, timedelta, timezone

from redis.exceptions import RedisError
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.db.models import Department, Employee, LeaveRequest, Notification
from app.deps import CurrentUser

CAN_VIEW_ORG_STATS = {"SUPER_ADMIN", "HR_ADMIN", "MANAGER"}
MONTHS_BACK = 11

logger = logging.getLogger("corehr.dashboard_cache")

# Org-wide summary is identical for every viewer with org-stats access, so it
# shares one cache entry. Personal summary is per-user.
_ORG_SUMMARY_CACHE_KEY = "dashboard:summary:org"
_PERSONAL_SUMMARY_CACHE_KEY_PREFIX = "dashboard:summary:user:"
_SUMMARY_CACHE_TTL_SECONDS = 60


def _personal_summary_cache_key(user_id: str) -> str:
    return f"{_PERSONAL_SUMMARY_CACHE_KEY_PREFIX}{user_id}"


async def _cached_json(key: str, compute) -> dict:
    """Cache-aside read: Redis hit short-circuits to Postgres; any Redis
    failure (down, network blip) degrades to computing straight from
    Postgres rather than breaking the endpoint."""
    redis = get_redis()

    try:
        cached = await redis.get(key)
    except RedisError:
        logger.warning("dashboard cache read failed for %s, falling back to Postgres", key)
        cached = None

    if cached is not None:
        return json.loads(cached)

    result = await compute()

    try:
        await redis.set(key, json.dumps(result), ex=_SUMMARY_CACHE_TTL_SECONDS)
    except RedisError:
        logger.warning("dashboard cache write failed for %s", key)

    return result


async def invalidate_org_summary_cache() -> None:
    try:
        await get_redis().delete(_ORG_SUMMARY_CACHE_KEY)
    except RedisError:
        logger.warning("failed to invalidate org dashboard cache")


async def invalidate_personal_summary_cache(user_id: str | None) -> None:
    if user_id is None:
        return
    try:
        await get_redis().delete(_personal_summary_cache_key(user_id))
    except RedisError:
        logger.warning("failed to invalidate personal dashboard cache for %s", user_id)


async def get_summary(db: AsyncSession, user: CurrentUser) -> dict:
    if user.role in CAN_VIEW_ORG_STATS:
        return await _cached_json(_ORG_SUMMARY_CACHE_KEY, lambda: _org_summary(db))
    return await _cached_json(_personal_summary_cache_key(user.id), lambda: _personal_summary(db, user))


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

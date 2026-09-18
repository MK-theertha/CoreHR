from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import AuditLog, LeaveRequest


@dataclass
class Actor:
    user_id: str
    ip_address: str | None = None


def record(
    db: AsyncSession,
    actor: Actor | None,
    *,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if actor is None:
        return
    db.add(
        AuditLog(
            user_id=actor.user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=actor.ip_address,
            metadata_=metadata,
        )
    )


def _serialize(entry: AuditLog) -> dict:
    return {
        "id": entry.id,
        "userId": entry.user_id,
        "action": entry.action,
        "entityType": entry.entity_type,
        "entityId": entry.entity_id,
        "timestamp": entry.timestamp,
        "ipAddress": entry.ip_address,
        "metadata": entry.metadata_,
        "user": (
            {"id": entry.user.id, "name": entry.user.name, "email": entry.user.email}
            if entry.user is not None
            else None
        ),
    }


async def list_entries(
    db: AsyncSession,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    user_id: str | None = None,
    page: int | None = None,
    page_size: int | None = None,
) -> dict:
    page = page if page and page >= 1 else 1
    page_size = page_size if page_size and 1 <= page_size <= 100 else 25

    query = select(AuditLog)
    count_query = select(func.count()).select_from(AuditLog)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)
        count_query = count_query.where(AuditLog.entity_id == entity_id)
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
        count_query = count_query.where(AuditLog.user_id == user_id)

    query = (
        query.options(selectinload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    entries = (await db.execute(query)).scalars().all()
    total = (await db.execute(count_query)).scalar_one()

    return {
        "entries": [_serialize(entry) for entry in entries],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def list_for_employee(db: AsyncSession, employee_id: str, *, page: int | None = None, page_size: int | None = None) -> dict:
    """A per-employee activity feed. Entries recording something done directly
    to the Employee row (entity_type="Employee") don't cover leave decisions —
    those are recorded against the LeaveRequest's own id, not the employee's —
    so this unions both and sorts in Python rather than a single filtered
    query, since the two live under different entity_type/entity_id pairs."""
    page = page if page and page >= 1 else 1
    page_size = page_size if page_size and 1 <= page_size <= 100 else 25

    employee_entries = (
        await db.execute(
            select(AuditLog)
            .options(selectinload(AuditLog.user))
            .where(AuditLog.entity_type == "Employee", AuditLog.entity_id == employee_id)
        )
    ).scalars().all()

    leave_entries = (
        await db.execute(
            select(AuditLog)
            .options(selectinload(AuditLog.user))
            .join(LeaveRequest, AuditLog.entity_id == LeaveRequest.id)
            .where(AuditLog.entity_type == "LeaveRequest", LeaveRequest.employee_id == employee_id)
        )
    ).scalars().all()

    all_entries = sorted([*employee_entries, *leave_entries], key=lambda entry: entry.timestamp, reverse=True)
    total = len(all_entries)
    start = (page - 1) * page_size
    page_entries = all_entries[start : start + page_size]

    return {
        "entries": [_serialize(entry) for entry in page_entries],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }

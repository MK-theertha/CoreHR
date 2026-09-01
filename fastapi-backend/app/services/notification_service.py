from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.db.models import Notification
from app.services import dashboard_service


def _serialize(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "isRead": notification.is_read,
        "userId": notification.user_id,
        "createdAt": notification.created_at,
    }


async def list_for_user(db: AsyncSession, user_id: str) -> list[dict]:
    notifications = (
        (await db.execute(select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())))
        .scalars()
        .all()
    )
    return [_serialize(n) for n in notifications]


def create(db: AsyncSession, *, user_id: str, title: str, message: str, type: str) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message, type=type))


async def mark_read(db: AsyncSession, notification_id: str, user_id: str) -> dict:
    notification = (await db.execute(select(Notification).where(Notification.id == notification_id))).scalar_one_or_none()
    if notification is None or notification.user_id != user_id:
        raise AppError("Notification not found", 404)
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    await dashboard_service.invalidate_personal_summary_cache(user_id)
    return _serialize(notification)


async def mark_all_read(db: AsyncSession, user_id: str) -> None:
    await db.execute(
        update(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False)).values(is_read=True)
    )
    await db.commit()
    await dashboard_service.invalidate_personal_summary_cache(user_id)

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db
from app.schemas.common import ok
from app.services import notification_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("")
async def list_notifications(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await notification_service.list_for_user(db, user.id))


@router.patch("/read-all")
async def mark_all_read(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await notification_service.mark_all_read(db, user.id)
    return ok({"message": "All notifications marked as read"})


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await notification_service.mark_read(db, notification_id, user.id))

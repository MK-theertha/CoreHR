from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.services import dashboard_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/summary")
async def summary(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await dashboard_service.get_summary(db, user))


@router.get("/trends", dependencies=[Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER"))])
async def trends(db: AsyncSession = Depends(get_db)):
    return ok(await dashboard_service.get_trends(db))


@router.get("/activity", dependencies=[Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER"))])
async def activity(db: AsyncSession = Depends(get_db)):
    return ok(await dashboard_service.get_activity(db))

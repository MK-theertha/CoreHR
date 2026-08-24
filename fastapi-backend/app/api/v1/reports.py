from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_roles
from app.schemas.common import ok
from app.services import reports_service

router = APIRouter(dependencies=[Depends(require_roles("SUPER_ADMIN"))])


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    return ok(await reports_service.get_summary(db))

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.csv_export import dict_rows_to_csv_response
from app.deps import get_db, require_roles
from app.schemas.common import ok
from app.services import reports_service

router = APIRouter(dependencies=[Depends(require_roles("SUPER_ADMIN"))])


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    return ok(await reports_service.get_summary(db))


@router.get("/summary/export")
async def export_summary(db: AsyncSession = Depends(get_db)):
    data = await reports_service.get_summary(db)
    return dict_rows_to_csv_response(data, filename="reports-summary.csv")

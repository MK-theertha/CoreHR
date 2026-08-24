from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_roles
from app.schemas.common import ok_paginated
from app.services import audit_service

router = APIRouter(dependencies=[Depends(require_roles("SUPER_ADMIN", "HR_ADMIN"))])


@router.get("")
async def list_audit_log(
    entityType: str | None = None,
    entityId: str | None = None,
    userId: str | None = None,
    page: int | None = None,
    pageSize: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    result = await audit_service.list_entries(
        db, entity_type=entityType, entity_id=entityId, user_id=userId, page=page, page_size=pageSize
    )
    return ok_paginated(result["entries"], total=result["total"], page=result["page"], page_size=result["pageSize"])

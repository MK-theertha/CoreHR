from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_roles
from app.schemas.common import ok
from app.schemas.organization import UpdateOrganizationRequest
from app.services import organization_service

router = APIRouter(dependencies=[Depends(require_roles("SUPER_ADMIN"))])


@router.get("")
async def get_organization(db: AsyncSession = Depends(get_db)):
    return ok(await organization_service.get_organization(db))


@router.patch("")
async def update_organization(body: UpdateOrganizationRequest, db: AsyncSession = Depends(get_db)):
    return ok(await organization_service.update_organization(db, name=body.name))

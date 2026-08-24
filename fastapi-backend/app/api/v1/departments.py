from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.departments import CreateDepartmentRequest, UpdateDepartmentRequest
from app.services import departments_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("")
async def list_departments(db: AsyncSession = Depends(get_db)):
    return ok(await departments_service.list_departments(db))


@router.get("/{department_id}")
async def get_department(department_id: str, db: AsyncSession = Depends(get_db)):
    return ok(await departments_service.get_department(db, department_id))


@router.post("")
async def create_department(
    body: CreateDepartmentRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN")),
):
    return ok(await departments_service.create_department(db, name=body.name))


@router.patch("/{department_id}")
async def update_department(
    department_id: str,
    body: UpdateDepartmentRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN")),
):
    return ok(await departments_service.update_department(db, department_id, name=body.name))


@router.delete("/{department_id}")
async def delete_department(
    department_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN")),
):
    return ok(await departments_service.delete_department(db, department_id))

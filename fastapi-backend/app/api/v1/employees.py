from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.employees import EmployeeCreateRequest, EmployeeMeUpdateRequest, EmployeeUpdateRequest
from app.services import employees_service
from app.services.audit_service import Actor

router = APIRouter(dependencies=[Depends(get_current_user)])

STAFF_ROLES = ("SUPER_ADMIN", "HR_ADMIN", "MANAGER")
ADMIN_ROLES = ("SUPER_ADMIN", "HR_ADMIN")


def _actor(request: Request, user: CurrentUser) -> Actor:
    return Actor(user_id=user.id, ip_address=request.client.host if request.client else None)


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await employees_service.get_me(db, user.id))


@router.patch("/me")
async def update_me(
    request: Request,
    body: EmployeeMeUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump(exclude_unset=True)
    result = await employees_service.update_me(db, user.id, payload, _actor(request, user))
    return ok(result)


@router.get("", dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def list_employees(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await employees_service.list_employees(db, user))


@router.get("/{employee_id}", dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def get_employee(employee_id: str, db: AsyncSession = Depends(get_db)):
    employee = await employees_service.get_employee(db, employee_id)
    if employee is None:
        raise AppError("Employee not found", 404)
    return ok(employee)


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def create_employee(
    request: Request,
    body: EmployeeCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump()
    result = await employees_service.create_employee(db, payload, _actor(request, user))
    return ok(result)


@router.patch("/{employee_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def update_employee(
    employee_id: str,
    request: Request,
    body: EmployeeUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump(exclude_unset=True)
    result = await employees_service.update_employee(db, employee_id, payload, _actor(request, user))
    return ok(result)


@router.delete("/{employee_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def delete_employee(
    employee_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await employees_service.delete_employee(db, employee_id, _actor(request, user))
    return ok(None)

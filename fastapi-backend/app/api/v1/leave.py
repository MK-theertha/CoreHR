from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.leave import CreateLeaveRequest, DecideLeaveRequest
from app.services import leave_service
from app.services.audit_service import Actor

router = APIRouter(dependencies=[Depends(get_current_user)])


def _actor(request: Request, user: CurrentUser) -> Actor:
    return Actor(user_id=user.id, ip_address=request.client.host if request.client else None)


@router.get("")
async def list_leave_requests(
    employeeId: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.list_for_user(db, user, employeeId))


@router.post("")
async def create_leave_request(
    request: Request,
    body: CreateLeaveRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.create(db, user.id, body, _actor(request, user)))


@router.patch("/{leave_id}/approve")
async def approve_leave_request(
    leave_id: str,
    request: Request,
    body: DecideLeaveRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER")),
):
    return ok(await leave_service.decide(db, leave_id, user.id, "APPROVED", body.comments, _actor(request, user)))


@router.patch("/{leave_id}/reject")
async def reject_leave_request(
    leave_id: str,
    request: Request,
    body: DecideLeaveRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER")),
):
    return ok(await leave_service.decide(db, leave_id, user.id, "REJECTED", body.comments, _actor(request, user)))


@router.patch("/{leave_id}/cancel")
async def cancel_leave_request(
    leave_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.cancel(db, leave_id, user.id, _actor(request, user)))

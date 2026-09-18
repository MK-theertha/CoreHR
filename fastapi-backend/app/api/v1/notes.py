from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_db, require_roles
from app.schemas.common import ok
from app.schemas.notes import NoteCreateRequest
from app.services import notes_service
from app.services.audit_service import Actor

# Internal HR notes about an employee — deliberately staff-only, never shown
# on the employee's own self-service views (see notes_service.Note docstring).
STAFF_ROLES = ("SUPER_ADMIN", "HR_ADMIN", "MANAGER")

router = APIRouter(dependencies=[Depends(require_roles(*STAFF_ROLES))])


def _actor(request: Request, user: CurrentUser) -> Actor:
    return Actor(user_id=user.id, ip_address=request.client.host if request.client else None)


@router.get("")
async def list_notes(employee_id: str, db: AsyncSession = Depends(get_db)):
    return ok(await notes_service.list_for_employee(db, employee_id))


@router.post("", status_code=201)
async def create_note(
    employee_id: str,
    request: Request,
    body: NoteCreateRequest,
    user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    return ok(await notes_service.create(db, employee_id=employee_id, body=body.body, actor=_actor(request, user)))


@router.delete("/{note_id}")
async def delete_note(
    employee_id: str,
    note_id: str,
    request: Request,
    user: CurrentUser = Depends(require_roles(*STAFF_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    await notes_service.delete(db, employee_id=employee_id, note_id=note_id, actor=_actor(request, user))
    return ok(None)

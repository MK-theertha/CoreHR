from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.users import UpdateRoleRequest
from app.services import users_service
from app.services.audit_service import Actor

router = APIRouter(dependencies=[Depends(require_roles("SUPER_ADMIN"))])


@router.get("/roles")
def list_roles():
    return ok(users_service.ROLES)


@router.patch("/{user_id}/role")
async def update_role(
    user_id: str,
    body: UpdateRoleRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    actor = Actor(user_id=user.id, ip_address=request.client.host if request.client else None)
    result = await users_service.update_role(db, user_id, body.role, actor)
    return ok(result)

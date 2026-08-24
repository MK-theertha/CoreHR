from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.db.models import User
from app.services import audit_service
from app.services.audit_service import Actor

ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"]


def to_public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organizationId": user.organization_id,
    }


async def update_role(db: AsyncSession, user_id: str, role: str, actor: Actor | None) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise AppError("User not found", 404)

    from_role = user.role
    user.role = role

    audit_service.record(
        db,
        actor,
        action="USER_ROLE_CHANGED",
        entity_type="User",
        entity_id=user_id,
        metadata={"fromRole": from_role, "toRole": role},
    )

    await db.commit()
    await db.refresh(user)

    return to_public_user(user)

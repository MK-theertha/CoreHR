from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.db.models import Organization


def _to_raw(organization: Organization) -> dict:
    return {
        "id": organization.id,
        "name": organization.name,
        "slug": organization.slug,
        "createdAt": organization.created_at,
        "updatedAt": organization.updated_at,
    }


async def get_organization(db: AsyncSession) -> dict:
    organization = (await db.execute(select(Organization).limit(1))).scalar_one_or_none()
    if organization is None:
        raise AppError("No organization configured", 500)
    return _to_raw(organization)


async def update_organization(db: AsyncSession, *, name: str) -> dict:
    organization = (await db.execute(select(Organization).limit(1))).scalar_one_or_none()
    if organization is None:
        raise AppError("No organization configured", 500)

    organization.name = name

    await db.commit()
    await db.refresh(organization)
    return _to_raw(organization)

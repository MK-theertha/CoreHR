from dataclasses import dataclass

import jwt
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.base import get_db

__all__ = ["get_db", "get_current_user", "require_roles", "CurrentUser"]


@dataclass
class CurrentUser:
    id: str
    email: str
    role: str
    organization_id: str | None


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("Unauthorized", 401)
    token = authorization[len("Bearer ") :]
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise AppError("Invalid or expired token", 401)
    return CurrentUser(
        id=payload["sub"],
        email=payload["email"],
        role=payload["role"],
        organization_id=payload.get("organizationId"),
    )


def require_roles(*roles: str):
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise AppError("Forbidden: insufficient permissions", 403)
        return user

    return dependency

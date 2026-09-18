import logging

import jwt as pyjwt
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.redis import get_redis
from app.core.security import (
    decode_refresh_token,
    hash_password,
    sign_access_token,
    sign_refresh_token,
    verify_password,
)
from app.db.models import Employee, Organization, User

logger = logging.getLogger("corehr.auth")

# -1 is a sentinel meaning "couldn't read the version from Redis" — never
# treated as a real version, so a Redis outage fails refresh-token checks
# open rather than locking everyone out (consistent with the fail-open
# convention used for Redis elsewhere, e.g. dashboard_service.py).
_VERSION_UNKNOWN = -1


def _token_version_key(user_id: str) -> str:
    return f"token_version:{user_id}"


async def get_token_version(user_id: str) -> int:
    try:
        raw = await get_redis().get(_token_version_key(user_id))
        return int(raw) if raw is not None else 0
    except RedisError:
        logger.warning("token_version read failed for %s; treating refresh token as valid", user_id)
        return _VERSION_UNKNOWN


async def bump_token_version(user_id: str) -> None:
    """Invalidates every outstanding refresh token for this user — the only
    session model this app has is a single httpOnly-cookie refresh token, so
    this doubles as both "logout" and "logout everywhere"."""
    try:
        await get_redis().incr(_token_version_key(user_id))
    except RedisError:
        logger.warning("logout: token_version bump failed for %s (Redis down); cookie still cleared", user_id)


def to_public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organizationId": user.organization_id,
    }


async def _issue_tokens(user: User) -> tuple[str, str]:
    access_token = sign_access_token(sub=user.id, email=user.email, role=user.role, organization_id=user.organization_id)
    ver = await get_token_version(user.id)
    refresh_token = sign_refresh_token(sub=user.id, ver=ver if ver != _VERSION_UNKNOWN else 0)
    return access_token, refresh_token


async def register(db: AsyncSession, *, name: str, email: str, password: str) -> dict:
    email = email.lower()
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        raise AppError("User already exists", 409)

    user = User(name=name, email=email, password_hash=hash_password(password), role="EMPLOYEE")
    db.add(user)
    await db.flush()

    employee = (await db.execute(select(Employee).where(Employee.email == email))).scalar_one_or_none()
    if employee is not None and employee.user_id is None:
        employee.user_id = user.id
    else:
        organization = (await db.execute(select(Organization))).scalars().first()
        db.add(
            Employee(
                full_name=name,
                email=email,
                organization_id=organization.id if organization else None,
                user_id=user.id,
                status="ACTIVE",
            )
        )

    await db.commit()
    await db.refresh(user)

    access_token, refresh_token = await _issue_tokens(user)
    return {"user": to_public_user(user), "accessToken": access_token, "refreshToken": refresh_token}


async def login(db: AsyncSession, *, email: str, password: str) -> dict:
    email = email.lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise AppError("Invalid credentials", 401)

    access_token, refresh_token = await _issue_tokens(user)
    return {"user": to_public_user(user), "accessToken": access_token, "refreshToken": refresh_token}


async def refresh(db: AsyncSession, *, refresh_token: str) -> dict:
    try:
        payload = decode_refresh_token(refresh_token)
        if payload.get("type") != "refresh":
            raise AppError("Invalid refresh token", 401)
    except pyjwt.PyJWTError:
        raise AppError("Invalid refresh token", 401)

    user = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if user is None:
        raise AppError("Invalid refresh token", 401)

    current_ver = await get_token_version(user.id)
    if current_ver != _VERSION_UNKNOWN and payload.get("ver", 0) != current_ver:
        raise AppError("Invalid refresh token", 401)

    access_token = sign_access_token(sub=user.id, email=user.email, role=user.role, organization_id=user.organization_id)
    return {"accessToken": access_token}


async def get_user_by_id(db: AsyncSession, user_id: str) -> dict | None:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    return to_public_user(user) if user is not None else None

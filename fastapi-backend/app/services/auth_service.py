import jwt as pyjwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import (
    decode_refresh_token,
    hash_password,
    sign_access_token,
    sign_refresh_token,
    verify_password,
)
from app.db.models import Employee, Organization, User


def to_public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organizationId": user.organization_id,
    }


def _issue_tokens(user: User) -> tuple[str, str]:
    access_token = sign_access_token(sub=user.id, email=user.email, role=user.role, organization_id=user.organization_id)
    refresh_token = sign_refresh_token(sub=user.id)
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

    access_token, refresh_token = _issue_tokens(user)
    return {"user": to_public_user(user), "accessToken": access_token, "refreshToken": refresh_token}


async def login(db: AsyncSession, *, email: str, password: str) -> dict:
    email = email.lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        raise AppError("Invalid credentials", 401)

    access_token, refresh_token = _issue_tokens(user)
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

    access_token = sign_access_token(sub=user.id, email=user.email, role=user.role, organization_id=user.organization_id)
    return {"accessToken": access_token}


async def get_user_by_id(db: AsyncSession, user_id: str) -> dict | None:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    return to_public_user(user) if user is not None else None

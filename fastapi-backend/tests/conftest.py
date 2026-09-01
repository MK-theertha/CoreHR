from datetime import datetime, timedelta, timezone

import jwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.security import hash_password, sign_token
from app.main import app

# Real seed users, one per role. Tests authenticate as these (rather than a
# fabricated "user-1") so that code paths which write an AuditLog row keyed
# on the actor's user id (a real FK, not nullable-away) don't blow up with a
# ForeignKeyViolationError.
ROLE_SEED_USERS = {
    "SUPER_ADMIN": {"email": "rbac-super-admin@corehr.test", "name": "RBAC Super Admin"},
    "HR_ADMIN": {"email": "rbac-hr-admin@corehr.test", "name": "RBAC HR Admin"},
    "MANAGER": {"email": "rbac-manager@corehr.test", "name": "RBAC Manager"},
    "EMPLOYEE": {"email": "rbac-employee@corehr.test", "name": "RBAC Employee"},
}

_seeded_user_ids: dict[str, str] = {}


@pytest_asyncio.fixture(scope="session", autouse=True)
async def seeded_role_users():
    from app.db.base import SessionLocal
    from app.db.models import User

    async with SessionLocal() as session:
        for role, info in ROLE_SEED_USERS.items():
            existing = (
                await session.execute(select(User).where(User.email == info["email"]))
            ).scalar_one_or_none()
            if existing is None:
                existing = User(
                    name=info["name"],
                    email=info["email"],
                    password_hash=hash_password("Test1234!"),
                    role=role,
                )
                session.add(existing)
                await session.flush()
            _seeded_user_ids[role] = existing.id
        await session.commit()
    return _seeded_user_ids


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def make_access_token(
    *,
    sub: str | None = None,
    email: str = "user@corehr.dev",
    role: str = "EMPLOYEE",
    organization_id: str | None = "org-1",
    secret: str | None = None,
    ttl: str = "15m",
    include_organization_id: bool = True,
    expired: bool = False,
) -> str:
    from app.core.config import settings

    if sub is None:
        sub = _seeded_user_ids.get(role, "user-1")

    payload = {"sub": sub, "email": email, "role": role}
    if include_organization_id:
        payload["organizationId"] = organization_id
    if expired:
        payload["exp"] = datetime.now(timezone.utc) - timedelta(seconds=10)
        return jwt.encode(payload, secret or settings.jwt_access_secret, algorithm="HS256")
    return sign_token(payload, secret or settings.jwt_access_secret, ttl)


def auth_header(role: str = "EMPLOYEE", **overrides) -> dict:
    return {"Authorization": f"Bearer {make_access_token(role=role, **overrides)}"}


@pytest.fixture
def token_factory():
    return make_access_token

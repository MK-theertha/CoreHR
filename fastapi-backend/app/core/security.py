import re
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from cuid2 import cuid_wrapper

from app.core.config import settings

new_cuid = cuid_wrapper()

_DURATION_RE = re.compile(r"^(\d+)\s*(s|m|h|d)$")
_UNIT_SECONDS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


def parse_duration_seconds(value: str) -> int:
    match = _DURATION_RE.match(value.strip())
    if not match:
        raise ValueError(f"Invalid duration string: {value}")
    amount, unit = match.groups()
    return int(amount) * _UNIT_SECONDS[unit]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def sign_token(payload: dict[str, Any], secret: str, ttl: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=parse_duration_seconds(ttl))
    return jwt.encode({**payload, "exp": expires_at}, secret, algorithm="HS256")


def sign_access_token(*, sub: str, email: str, role: str, organization_id: str | None) -> str:
    return sign_token(
        {"sub": sub, "email": email, "role": role, "organizationId": organization_id},
        settings.jwt_access_secret,
        settings.jwt_access_ttl,
    )


def sign_refresh_token(*, sub: str) -> str:
    return sign_token({"sub": sub, "type": "refresh"}, settings.jwt_refresh_secret, settings.jwt_refresh_ttl)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_access_secret, algorithms=["HS256"])


def decode_refresh_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_refresh_secret, algorithms=["HS256"])

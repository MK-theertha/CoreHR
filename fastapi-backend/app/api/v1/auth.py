from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import parse_duration_seconds
from app.deps import CurrentUser, get_current_user, get_db
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.common import ok
from app.services import auth_service

router = APIRouter()

REFRESH_COOKIE_NAME = "refreshToken"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, refresh_token: str, *, remember: bool) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        max_age=parse_duration_seconds(settings.jwt_refresh_ttl) if remember else None,
    )


@router.post("/register", status_code=201)
async def register(response: Response, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await auth_service.register(db, name=body.name, email=body.email, password=body.password)
    _set_refresh_cookie(response, result["refreshToken"], remember=True)
    return ok({"user": result["user"], "accessToken": result["accessToken"]})


@router.post("/login")
async def login(response: Response, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await auth_service.login(db, email=body.email, password=body.password)
    _set_refresh_cookie(response, result["refreshToken"], remember=body.remember)
    return ok({"user": result["user"], "accessToken": result["accessToken"]})


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise AppError("Invalid refresh token", 401)
    result = await auth_service.refresh(db, refresh_token=refresh_token)
    return ok(result)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return ok(None)


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    record = await auth_service.get_user_by_id(db, user.id)
    return ok(record)

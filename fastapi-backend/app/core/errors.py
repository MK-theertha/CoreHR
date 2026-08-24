import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500, is_operational: bool = True):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.is_operational = is_operational


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        if not exc.is_operational:
            return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error"})
        body = {"success": False, "message": exc.message}
        if settings.app_env == "development":
            body["stack"] = "".join(traceback.format_exception(exc))
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Validation error", "errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error"})

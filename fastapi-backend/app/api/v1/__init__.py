from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    dashboard,
    departments,
    employees,
    leave,
    notifications,
    organization,
    reports,
    users,
)

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(employees.router, prefix="/employees", tags=["employees"])
router.include_router(departments.router, prefix="/departments", tags=["departments"])
router.include_router(leave.router, prefix="/leave", tags=["leave"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(organization.router, prefix="/organization", tags=["organization"])
router.include_router(audit.router, prefix="/audit", tags=["audit"])

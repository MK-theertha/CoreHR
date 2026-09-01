from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import s3
from app.core.errors import AppError
from app.core.util import to_naive_utc
from app.db.models import Department, Employee, Organization
from app.deps import CurrentUser
from app.services import audit_service, dashboard_service
from app.services.audit_service import Actor

# Content-type allowlist for profile image uploads, and the extension each
# maps to for the deterministic S3 key (one image per employee — a new
# upload overwrites the last one rather than accumulating objects).
PROFILE_IMAGE_CONTENT_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _profile_image_key(employee_id: str, content_type: str) -> str:
    return f"employees/{employee_id}/profile-image.{PROFILE_IMAGE_CONTENT_TYPES[content_type]}"


def _serialize_department(department: Department | None) -> dict | None:
    if department is None:
        return None
    return {
        "id": department.id,
        "name": department.name,
        "organizationId": department.organization_id,
        "createdAt": department.created_at,
    }


def _serialize(employee: Employee) -> dict:
    return {
        "id": employee.id,
        "fullName": employee.full_name,
        "email": employee.email,
        "phone": employee.phone,
        "dateOfBirth": employee.date_of_birth,
        "gender": employee.gender,
        "jobTitle": employee.job_title,
        "departmentId": employee.department_id,
        "department": _serialize_department(employee.department),
        "joiningDate": employee.joining_date,
        "status": employee.status,
        # The DB stores an S3 object key (bucket is private), never a raw
        # URL — resolve it to a short-lived pre-signed GET URL on the way out.
        "profileImage": s3.generate_presigned_get_url(employee.profile_image) if employee.profile_image else None,
        "organizationId": employee.organization_id,
        "userId": employee.user_id,
        "createdAt": employee.created_at,
        "updatedAt": employee.updated_at,
    }


def _json_safe(payload: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        safe[key] = value.isoformat() if isinstance(value, datetime) else value
    return safe


async def list_employees(db: AsyncSession, user: CurrentUser) -> list[dict]:
    if user.role == "MANAGER":
        manager = (
            await db.execute(select(Employee).where(Employee.user_id == user.id))
        ).scalar_one_or_none()
        if manager is None or manager.department_id is None:
            return []
        employees = (
            await db.execute(
                select(Employee)
                .options(selectinload(Employee.department))
                .where(Employee.department_id == manager.department_id)
                .order_by(Employee.created_at.desc())
            )
        ).scalars().all()
        return [_serialize(e) for e in employees]

    employees = (
        await db.execute(
            select(Employee).options(selectinload(Employee.department)).order_by(Employee.created_at.desc())
        )
    ).scalars().all()
    return [_serialize(e) for e in employees]


async def get_employee(db: AsyncSession, employee_id: str) -> dict | None:
    employee = (
        await db.execute(
            select(Employee).options(selectinload(Employee.department)).where(Employee.id == employee_id)
        )
    ).scalar_one_or_none()
    return _serialize(employee) if employee is not None else None


async def get_employee_by_user_id(db: AsyncSession, user_id: str) -> dict | None:
    employee = (
        await db.execute(
            select(Employee).options(selectinload(Employee.department)).where(Employee.user_id == user_id)
        )
    ).scalar_one_or_none()
    return _serialize(employee) if employee is not None else None


async def create_employee(db: AsyncSession, payload: dict[str, Any], actor: Actor | None) -> dict:
    existing = (
        await db.execute(select(Employee).where(Employee.email == payload["email"]))
    ).scalar_one_or_none()
    if existing is not None:
        raise AppError("An employee with this email already exists", 409)

    organization = (await db.execute(select(Organization))).scalars().first()

    employee = Employee(
        full_name=payload["fullName"],
        email=payload["email"],
        department_id=payload.get("departmentId"),
        job_title=payload.get("jobTitle"),
        status=payload["status"],
        phone=payload.get("phone"),
        gender=payload.get("gender"),
        date_of_birth=to_naive_utc(payload.get("dateOfBirth")),
        joining_date=to_naive_utc(payload.get("joiningDate")),
        organization_id=organization.id if organization is not None else None,
    )
    db.add(employee)
    await db.flush()

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_CREATED",
        entity_type="Employee",
        entity_id=employee.id,
        metadata={"fullName": employee.full_name, "email": employee.email},
    )

    await db.commit()
    await dashboard_service.invalidate_org_summary_cache()
    return await get_employee(db, employee.id)


async def update_employee(db: AsyncSession, employee_id: str, payload: dict[str, Any], actor: Actor | None) -> dict:
    employee = (await db.execute(select(Employee).where(Employee.id == employee_id))).scalar_one_or_none()
    if employee is None:
        raise AppError("Employee not found", 404)

    if "fullName" in payload:
        employee.full_name = payload["fullName"]
    if "email" in payload:
        employee.email = payload["email"]
    if "departmentId" in payload:
        department_id = payload["departmentId"]
        employee.department_id = None if department_id == "" else department_id
    if "jobTitle" in payload:
        employee.job_title = payload["jobTitle"]
    if "status" in payload:
        employee.status = payload["status"]
    if "phone" in payload:
        employee.phone = payload["phone"]
    if "gender" in payload:
        employee.gender = payload["gender"]
    if "dateOfBirth" in payload:
        employee.date_of_birth = to_naive_utc(payload["dateOfBirth"])
    if "joiningDate" in payload:
        employee.joining_date = to_naive_utc(payload["joiningDate"])

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_UPDATED",
        entity_type="Employee",
        entity_id=employee_id,
        metadata={"changes": _json_safe(payload)},
    )

    await db.commit()
    await dashboard_service.invalidate_org_summary_cache()
    return await get_employee(db, employee_id)


async def delete_employee(db: AsyncSession, employee_id: str, actor: Actor | None) -> None:
    employee = (await db.execute(select(Employee).where(Employee.id == employee_id))).scalar_one_or_none()
    if employee is None:
        raise AppError("Employee not found", 404)

    metadata = {"fullName": employee.full_name, "email": employee.email}
    audit_service.record(
        db, actor, action="EMPLOYEE_DELETED", entity_type="Employee", entity_id=employee_id, metadata=metadata
    )
    await db.delete(employee)
    await db.commit()
    await dashboard_service.invalidate_org_summary_cache()


async def get_me(db: AsyncSession, user_id: str) -> dict:
    employee = await get_employee_by_user_id(db, user_id)
    if employee is None:
        raise AppError("No employee profile linked to this account", 404)
    return employee


async def update_me(db: AsyncSession, user_id: str, payload: dict[str, Any], actor: Actor | None) -> dict:
    employee = await get_employee_by_user_id(db, user_id)
    if employee is None:
        raise AppError("No employee profile linked to this account", 404)
    return await update_employee(db, employee["id"], payload, actor)


async def create_profile_image_upload_url(db: AsyncSession, user_id: str, content_type: str) -> dict:
    employee = (await db.execute(select(Employee).where(Employee.user_id == user_id))).scalar_one_or_none()
    if employee is None:
        raise AppError("No employee profile linked to this account", 404)

    key = _profile_image_key(employee.id, content_type)
    return {
        "uploadUrl": s3.generate_presigned_put_url(key, content_type),
        "contentType": content_type,
        "expiresIn": s3.PRESIGNED_URL_TTL_SECONDS,
    }


async def confirm_profile_image(db: AsyncSession, user_id: str, content_type: str, actor: Actor | None) -> dict:
    """Called after the client has successfully PUT the file straight to S3
    using the pre-signed URL from create_profile_image_upload_url. Recomputes
    the same deterministic key server-side rather than trusting a key/path
    from the client."""
    employee = (await db.execute(select(Employee).where(Employee.user_id == user_id))).scalar_one_or_none()
    if employee is None:
        raise AppError("No employee profile linked to this account", 404)

    employee.profile_image = _profile_image_key(employee.id, content_type)

    audit_service.record(
        db, actor, action="EMPLOYEE_UPDATED", entity_type="Employee", entity_id=employee.id,
        metadata={"changes": {"profileImage": True}},
    )

    await db.commit()
    return await get_employee(db, employee.id)

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.db.models import Department, Employee, Organization, User
from app.services import dashboard_service


def _to_raw(department: Department) -> dict:
    return {
        "id": department.id,
        "name": department.name,
        "organizationId": department.organization_id,
        "createdAt": department.created_at,
    }


async def _employee_count(db: AsyncSession, department_id: str) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(Employee).where(Employee.department_id == department_id)
        )
    ).scalar_one()


async def _manager(db: AsyncSession, department_id: str) -> dict | None:
    employee = (
        await db.execute(
            select(Employee)
            .join(User, Employee.user_id == User.id)
            .where(Employee.department_id == department_id, User.role == "MANAGER")
            .order_by(Employee.created_at.asc())
        )
    ).scalars().first()
    if employee is None:
        return None
    return {"id": employee.id, "fullName": employee.full_name, "email": employee.email}


async def _to_enriched(db: AsyncSession, department: Department) -> dict:
    return {
        **_to_raw(department),
        "employeeCount": await _employee_count(db, department.id),
        "manager": await _manager(db, department.id),
    }


async def list_departments(db: AsyncSession) -> list[dict]:
    departments = (
        await db.execute(select(Department).order_by(Department.name.asc()))
    ).scalars().all()
    return [await _to_enriched(db, department) for department in departments]


async def get_department(db: AsyncSession, department_id: str) -> dict:
    department = (
        await db.execute(select(Department).where(Department.id == department_id))
    ).scalar_one_or_none()
    if department is None:
        raise AppError("Department not found", 404)
    return await _to_enriched(db, department)


async def create_department(db: AsyncSession, *, name: str) -> dict:
    organization = (await db.execute(select(Organization))).scalars().first()
    if organization is None:
        raise AppError("No organization configured", 500)

    department = Department(name=name, organization_id=organization.id)
    db.add(department)
    await db.commit()
    await db.refresh(department)
    await dashboard_service.invalidate_org_summary_cache()
    return _to_raw(department)


async def update_department(db: AsyncSession, department_id: str, *, name: str | None) -> dict:
    department = (
        await db.execute(select(Department).where(Department.id == department_id))
    ).scalar_one_or_none()
    if department is None:
        raise AppError("Department not found", 404)

    if name is not None:
        department.name = name

    await db.commit()
    await db.refresh(department)
    await dashboard_service.invalidate_org_summary_cache()
    return _to_raw(department)


async def delete_department(db: AsyncSession, department_id: str) -> dict:
    department = (
        await db.execute(select(Department).where(Department.id == department_id))
    ).scalar_one_or_none()
    if department is None:
        raise AppError("Department not found", 404)

    result = _to_raw(department)
    await db.delete(department)
    await db.commit()
    await dashboard_service.invalidate_org_summary_cache()
    return result

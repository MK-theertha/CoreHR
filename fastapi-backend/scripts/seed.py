"""Idempotent dev-data seed — mirrors backend/prisma/seed.ts so the same
login credentials work against either backend during the migration.

A fresh database has no Organization row at all, and department/employee
creation (departments_service.create_department) hard-requires one — so
without this, a brand new deployment can't do anything past registering a
bare EMPLOYEE account. Run once per database:

    cd fastapi-backend && python -m scripts.seed
"""

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import SessionLocal
from app.db.models import Department, Employee, Organization, User


async def _get_or_create_organization(db) -> Organization:
    organization = (
        await db.execute(select(Organization).where(Organization.slug == "corehr"))
    ).scalar_one_or_none()
    if organization is None:
        organization = Organization(name="CoreHR", slug="corehr")
        db.add(organization)
        await db.flush()
    return organization


async def _get_or_create_department(db, *, name: str, organization_id: str) -> Department:
    department = (
        await db.execute(
            select(Department).where(Department.name == name, Department.organization_id == organization_id)
        )
    ).scalar_one_or_none()
    if department is None:
        department = Department(name=name, organization_id=organization_id)
        db.add(department)
        await db.flush()
    return department


async def _get_or_create_user(db, *, name: str, email: str, password: str, role: str, organization_id: str) -> User:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            organization_id=organization_id,
        )
        db.add(user)
        await db.flush()
    return user


async def _get_or_create_employee(
    db, *, user: User, job_title: str, department_id: str, organization_id: str
) -> Employee:
    employee = (await db.execute(select(Employee).where(Employee.email == user.email))).scalar_one_or_none()
    if employee is None:
        employee = Employee(
            full_name=user.name,
            email=user.email,
            job_title=job_title,
            department_id=department_id,
            organization_id=organization_id,
            user_id=user.id,
            status="ACTIVE",
        )
        db.add(employee)
        await db.flush()
    return employee


async def main() -> None:
    async with SessionLocal() as db:
        organization = await _get_or_create_organization(db)
        engineering = await _get_or_create_department(db, name="Engineering", organization_id=organization.id)
        people_ops = await _get_or_create_department(db, name="People Ops", organization_id=organization.id)

        admin = await _get_or_create_user(
            db,
            name="System Administrator",
            email="admin@corehr.dev",
            password="Admin@123",
            role="SUPER_ADMIN",
            organization_id=organization.id,
        )
        await _get_or_create_employee(
            db, user=admin, job_title="System Administrator",
            department_id=people_ops.id, organization_id=organization.id,
        )

        manager = await _get_or_create_user(
            db,
            name="Daniel Ross",
            email="manager@corehr.dev",
            password="Manager@123",
            role="MANAGER",
            organization_id=organization.id,
        )
        await _get_or_create_employee(
            db, user=manager, job_title="Engineering Manager",
            department_id=engineering.id, organization_id=organization.id,
        )

        employee_user = await _get_or_create_user(
            db,
            name="Alicia Morgan",
            email="alicia.morgan@corehr.dev",
            password="Employee@123",
            role="EMPLOYEE",
            organization_id=organization.id,
        )
        await _get_or_create_employee(
            db, user=employee_user, job_title="Senior Frontend Engineer",
            department_id=engineering.id, organization_id=organization.id,
        )

        await db.commit()
        print(f"Seed complete — organization={organization.slug!r}, "
              f"departments=[{engineering.name!r}, {people_ops.name!r}], "
              f"users=[admin@corehr.dev, manager@corehr.dev, alicia.morgan@corehr.dev]")


if __name__ == "__main__":
    asyncio.run(main())

import pytest
import pytest_asyncio

from app.db.base import SessionLocal
from app.db.models import Employee
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def employee_with_user(seeded_role_users):
    async with SessionLocal() as db:
        employee = Employee(
            full_name="Role Field Tester",
            email="role-field-tester@corehr.test",
            status="ACTIVE",
            user_id=_seeded_user_ids["MANAGER"],
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        employee_id = employee.id
    yield employee_id
    async with SessionLocal() as db:
        row = await db.get(Employee, employee_id)
        if row is not None:
            await db.delete(row)
            await db.commit()


async def test_employee_list_includes_linked_users_role(client, employee_with_user):
    response = await client.get("/api/v1/employees", headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    match = next(e for e in response.json()["data"] if e["id"] == employee_with_user)
    assert match["role"] == "MANAGER"


async def test_employee_detail_includes_linked_users_role(client, employee_with_user):
    response = await client.get(f"/api/v1/employees/{employee_with_user}", headers=auth_header(role="HR_ADMIN"))
    assert response.status_code == 200
    assert response.json()["data"]["role"] == "MANAGER"


async def test_employee_role_is_null_without_linked_user(client):
    create_resp = await client.post(
        "/api/v1/employees",
        json={"fullName": "No User Linked", "email": "no-user-linked@corehr.dev"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert create_resp.status_code == 201
    body = create_resp.json()["data"]
    assert body["role"] is None

    await client.delete(f"/api/v1/employees/{body['id']}", headers=auth_header(role="SUPER_ADMIN"))

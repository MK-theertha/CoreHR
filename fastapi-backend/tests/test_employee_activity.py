import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.db.base import SessionLocal
from app.db.models import Employee, LeaveRequest
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio

LEAVE_BODY = {
    "leaveType": "Sick",
    "startDate": "2026-04-01T00:00:00Z",
    "endDate": "2026-04-02T00:00:00Z",
    "reason": "activity test reason",
}


@pytest_asyncio.fixture
async def employee_profile(seeded_role_users):
    async with SessionLocal() as db:
        employee = Employee(
            full_name="Activity Tester",
            email="activity-tester@corehr.test",
            status="ACTIVE",
            user_id=_seeded_user_ids["EMPLOYEE"],
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        employee_id = employee.id
    yield employee_id
    async with SessionLocal() as db:
        await db.execute(delete(LeaveRequest).where(LeaveRequest.employee_id == employee_id))
        await db.commit()
        row = await db.get(Employee, employee_id)
        if row is not None:
            await db.delete(row)
            await db.commit()


async def test_employee_can_view_own_activity_including_leave_decisions(client, employee_profile):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    assert create_resp.status_code == 200
    leave_id = create_resp.json()["data"]["id"]

    await client.patch(f"/api/v1/leave/{leave_id}/approve", json={}, headers=auth_header(role="MANAGER"))

    response = await client.get(f"/api/v1/employees/{employee_profile}/activity", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 200
    body = response.json()
    actions = [entry["action"] for entry in body["data"]]
    assert "LEAVE_REQUESTED" in actions
    assert "LEAVE_APPROVED" in actions


async def test_staff_can_view_any_employees_activity(client, employee_profile):
    response = await client.get(
        f"/api/v1/employees/{employee_profile}/activity", headers=auth_header(role="HR_ADMIN")
    )
    assert response.status_code == 200


async def test_other_employee_cannot_view_someone_elses_activity(client, employee_profile):
    response = await client.get(
        f"/api/v1/employees/{employee_profile}/activity",
        headers=auth_header(role="EMPLOYEE", sub="someone-else-entirely"),
    )
    assert response.status_code == 404


async def test_activity_response_is_paginated(client, employee_profile):
    response = await client.get(
        f"/api/v1/employees/{employee_profile}/activity",
        params={"pageSize": 5},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body["meta"].keys()) == {"total", "page", "pageSize"}
    assert body["meta"]["pageSize"] == 5

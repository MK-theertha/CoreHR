from unittest.mock import Mock

import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.db.base import SessionLocal
from app.db.models import Employee, LeaveRequest
from app.services import email_service
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio

LEAVE_BODY = {
    "leaveType": "Sick",
    "startDate": "2026-02-01T00:00:00Z",
    "endDate": "2026-02-02T00:00:00Z",
    "reason": "test reason",
}


async def _make_employee(*, role: str, email: str) -> str:
    async with SessionLocal() as db:
        employee = Employee(full_name=f"{role} Leave Tester", email=email, status="ACTIVE", user_id=_seeded_user_ids[role])
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        return employee.id


async def _cleanup_employee(employee_id: str) -> None:
    async with SessionLocal() as db:
        await db.execute(delete(LeaveRequest).where(LeaveRequest.employee_id == employee_id))
        await db.commit()
        row = await db.get(Employee, employee_id)
        if row is not None:
            await db.delete(row)
            await db.commit()


@pytest_asyncio.fixture
async def employee_profile(seeded_role_users):
    """An Employee row linked to the seeded EMPLOYEE user, so /leave (which
    resolves "own employee" via Employee.user_id) has something to act on."""
    employee_id = await _make_employee(role="EMPLOYEE", email="leave-test-employee@corehr.test")
    yield employee_id
    await _cleanup_employee(employee_id)


@pytest_asyncio.fixture
async def manager_employee_profile(seeded_role_users):
    """An Employee row linked to the seeded MANAGER user, to test that a
    manager can't approve/reject their own leave request."""
    employee_id = await _make_employee(role="MANAGER", email="manager-self-leave@corehr.test")
    yield employee_id
    await _cleanup_employee(employee_id)


@pytest.fixture
def mock_emails(monkeypatch):
    mocks = {"requested": Mock(), "decided": Mock(), "cancelled": Mock()}
    monkeypatch.setattr(email_service, "send_leave_requested", mocks["requested"])
    monkeypatch.setattr(email_service, "send_leave_decided", mocks["decided"])
    monkeypatch.setattr(email_service, "send_leave_cancelled", mocks["cancelled"])
    return mocks


async def test_create_leave_request_sends_confirmation_email(client, employee_profile, mock_emails):
    response = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "PENDING"
    assert mock_emails["requested"].call_count == 1


async def test_create_leave_request_rejects_bad_date_range(client, employee_profile):
    response = await client.post(
        "/api/v1/leave",
        json={**LEAVE_BODY, "startDate": "2026-02-05T00:00:00Z", "endDate": "2026-02-01T00:00:00Z"},
        headers=auth_header(role="EMPLOYEE"),
    )
    assert response.status_code == 400


async def test_approve_leave_request(client, employee_profile, mock_emails):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    leave_id = create_resp.json()["data"]["id"]

    approve_resp = await client.patch(
        f"/api/v1/leave/{leave_id}/approve", json={"comments": "enjoy"}, headers=auth_header(role="MANAGER")
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "APPROVED"
    assert mock_emails["decided"].call_count == 1


async def test_reject_leave_request(client, employee_profile):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    leave_id = create_resp.json()["data"]["id"]

    reject_resp = await client.patch(f"/api/v1/leave/{leave_id}/reject", json={}, headers=auth_header(role="HR_ADMIN"))
    assert reject_resp.status_code == 200
    assert reject_resp.json()["data"]["status"] == "REJECTED"


async def test_cannot_decide_already_decided_leave_request(client, employee_profile):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    leave_id = create_resp.json()["data"]["id"]
    await client.patch(f"/api/v1/leave/{leave_id}/approve", json={}, headers=auth_header(role="MANAGER"))

    second_resp = await client.patch(f"/api/v1/leave/{leave_id}/reject", json={}, headers=auth_header(role="MANAGER"))
    assert second_resp.status_code == 400


async def test_cannot_approve_own_leave_request(client, manager_employee_profile):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="MANAGER"))
    leave_id = create_resp.json()["data"]["id"]

    approve_resp = await client.patch(f"/api/v1/leave/{leave_id}/approve", json={}, headers=auth_header(role="MANAGER"))
    assert approve_resp.status_code == 403


async def test_cancel_pending_leave_request(client, employee_profile, mock_emails):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    leave_id = create_resp.json()["data"]["id"]

    cancel_resp = await client.patch(f"/api/v1/leave/{leave_id}/cancel", headers=auth_header(role="EMPLOYEE"))
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["data"]["status"] == "CANCELLED"
    assert mock_emails["cancelled"].call_count == 1


async def test_cannot_cancel_already_decided_leave_request(client, employee_profile):
    create_resp = await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))
    leave_id = create_resp.json()["data"]["id"]
    await client.patch(f"/api/v1/leave/{leave_id}/approve", json={}, headers=auth_header(role="MANAGER"))

    cancel_resp = await client.patch(f"/api/v1/leave/{leave_id}/cancel", headers=auth_header(role="EMPLOYEE"))
    assert cancel_resp.status_code == 400


async def test_employee_sees_only_own_leave_requests(client, employee_profile):
    await client.post("/api/v1/leave", json=LEAVE_BODY, headers=auth_header(role="EMPLOYEE"))

    other_response = await client.get(
        "/api/v1/leave", headers=auth_header(role="EMPLOYEE", sub="someone-else-entirely")
    )
    assert other_response.json()["data"] == []

    own_response = await client.get("/api/v1/leave", headers=auth_header(role="EMPLOYEE"))
    assert len(own_response.json()["data"]) >= 1

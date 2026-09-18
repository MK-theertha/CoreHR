import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


async def test_audit_log_requires_hr_or_admin_role(client):
    response = await client.get("/api/v1/audit", headers=auth_header(role="MANAGER"))
    assert response.status_code == 403


async def test_audit_log_records_employee_created_action(client):
    create_resp = await client.post(
        "/api/v1/employees",
        json={"fullName": "Audit Test Employee", "email": "audit-test-employee@corehr.dev"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert create_resp.status_code == 201
    employee_id = create_resp.json()["data"]["id"]

    try:
        list_resp = await client.get(
            "/api/v1/audit",
            params={"entityType": "Employee", "entityId": employee_id},
            headers=auth_header(role="SUPER_ADMIN"),
        )
        assert list_resp.status_code == 200
        body = list_resp.json()
        assert body["meta"]["total"] == 1
        entry = body["data"][0]
        assert entry["action"] == "EMPLOYEE_CREATED"
        assert entry["entityId"] == employee_id
        assert entry["user"]["id"] is not None
    finally:
        await client.delete(f"/api/v1/employees/{employee_id}", headers=auth_header(role="SUPER_ADMIN"))


async def test_audit_log_pagination_shape(client):
    response = await client.get("/api/v1/audit", params={"pageSize": 5}, headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    body = response.json()
    assert set(body["meta"].keys()) == {"total", "page", "pageSize"}
    assert body["meta"]["pageSize"] == 5

import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


async def test_create_department_with_open_positions(client):
    create_resp = await client.post(
        "/api/v1/departments",
        json={"name": "Platform Engineering", "openPositions": 3},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert create_resp.status_code == 200
    department_id = create_resp.json()["data"]["id"]
    assert create_resp.json()["data"]["openPositions"] == 3

    try:
        get_resp = await client.get(f"/api/v1/departments/{department_id}", headers=auth_header(role="EMPLOYEE"))
        assert get_resp.status_code == 200
        assert get_resp.json()["data"]["openPositions"] == 3
    finally:
        await client.delete(f"/api/v1/departments/{department_id}", headers=auth_header(role="SUPER_ADMIN"))


async def test_create_department_without_open_positions_defaults_to_null(client):
    create_resp = await client.post(
        "/api/v1/departments", json={"name": "Design"}, headers=auth_header(role="SUPER_ADMIN")
    )
    assert create_resp.status_code == 200
    department_id = create_resp.json()["data"]["id"]
    assert create_resp.json()["data"]["openPositions"] is None

    await client.delete(f"/api/v1/departments/{department_id}", headers=auth_header(role="SUPER_ADMIN"))


async def test_update_department_open_positions(client):
    create_resp = await client.post(
        "/api/v1/departments", json={"name": "Data Science"}, headers=auth_header(role="HR_ADMIN")
    )
    department_id = create_resp.json()["data"]["id"]

    try:
        update_resp = await client.patch(
            f"/api/v1/departments/{department_id}",
            json={"openPositions": 5},
            headers=auth_header(role="HR_ADMIN"),
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["data"]["openPositions"] == 5
    finally:
        await client.delete(f"/api/v1/departments/{department_id}", headers=auth_header(role="SUPER_ADMIN"))

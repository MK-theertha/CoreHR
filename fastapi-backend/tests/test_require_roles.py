import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio

ORG = "/api/v1/organization"


async def test_no_token_is_unauthorized(client):
    response = await client.get(ORG)
    assert response.status_code == 401


async def test_disallowed_role_is_forbidden(client):
    response = await client.get(ORG, headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 403
    assert response.json()["message"] == "Forbidden: insufficient permissions"


async def test_allowed_role_passes_guard(client):
    response = await client.get(ORG, headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code != 403
    assert response.status_code != 401


async def test_role_check_is_exact_match_only(client):
    response = await client.get(ORG, headers=auth_header(role="ADMIN"))
    assert response.status_code == 403

import pytest

from tests.conftest import auth_header, make_access_token

pytestmark = pytest.mark.asyncio

ME = "/api/v1/auth/me"


async def test_missing_header_is_unauthorized(client):
    response = await client.get(ME)
    assert response.status_code == 401
    assert response.json()["message"] == "Unauthorized"


async def test_non_bearer_header_is_unauthorized(client):
    response = await client.get(ME, headers={"Authorization": "Basic abc123"})
    assert response.status_code == 401
    assert response.json()["message"] == "Unauthorized"


async def test_wrong_secret_is_invalid_token(client):
    token = make_access_token(secret="wrong-secret")
    response = await client.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["message"] == "Invalid or expired token"


async def test_expired_token_is_invalid_token(client):
    token = make_access_token(expired=True)
    response = await client.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["message"] == "Invalid or expired token"


async def test_valid_token_is_accepted(client):
    response = await client.get(ME, headers=auth_header())
    assert response.status_code == 200


async def test_missing_organization_id_defaults_to_none(client):
    token = make_access_token(include_organization_id=False)
    response = await client.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

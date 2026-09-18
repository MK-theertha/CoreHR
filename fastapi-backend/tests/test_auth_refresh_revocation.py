import pytest
from redis.exceptions import RedisError

from app.core import redis as redis_module

pytestmark = pytest.mark.asyncio

TEST_USER = {"name": "Refresh Revocation Tester", "email": "refresh-revocation@corehr.dev", "password": "Test1234!"}


async def _register_or_login(client):
    response = await client.post("/api/v1/auth/register", json=TEST_USER)
    if response.status_code == 409:
        response = await client.post(
            "/api/v1/auth/login", json={"email": TEST_USER["email"], "password": TEST_USER["password"]}
        )
    assert response.status_code in (200, 201)
    return response


async def test_refresh_succeeds_before_logout(client):
    await _register_or_login(client)
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert "accessToken" in response.json()["data"]


async def test_refresh_fails_after_logout_with_old_cookie(client):
    await _register_or_login(client)
    old_cookie = client.cookies.get("refreshToken")
    assert old_cookie

    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200

    # Replay the pre-logout token explicitly (the client's own cookie jar was
    # just cleared by the Set-Cookie deletion) to prove a captured refresh
    # token is now rejected, not just that the cookie is gone client-side.
    client.cookies.set("refreshToken", old_cookie)
    replay_resp = await client.post("/api/v1/auth/refresh")
    assert replay_resp.status_code == 401


async def test_fresh_login_after_logout_still_works(client):
    await _register_or_login(client)
    await client.post("/api/v1/auth/logout")

    login_resp = await client.post(
        "/api/v1/auth/login", json={"email": TEST_USER["email"], "password": TEST_USER["password"]}
    )
    assert login_resp.status_code == 200

    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200


async def test_refresh_check_fails_open_when_redis_unavailable(client, monkeypatch):
    await _register_or_login(client)

    class BrokenRedis:
        async def get(self, *_args, **_kwargs):
            raise RedisError("boom")

        async def incr(self, *_args, **_kwargs):
            raise RedisError("boom")

    monkeypatch.setattr(redis_module, "_client", BrokenRedis())

    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.db.base import SessionLocal
from app.db.models import Notification
from app.services import notification_service
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def seeded_notification(seeded_role_users):
    user_id = _seeded_user_ids["EMPLOYEE"]
    async with SessionLocal() as db:
        notification_service.create(db, user_id=user_id, title="Leave update", message="Hello", type="LEAVE")
        await db.commit()
        notification_id = (
            (
                await db.execute(
                    select(Notification)
                    .where(Notification.user_id == user_id)
                    .order_by(Notification.created_at.desc())
                )
            )
            .scalars()
            .first()
            .id
        )
    yield notification_id
    async with SessionLocal() as db:
        row = await db.get(Notification, notification_id)
        if row is not None:
            await db.delete(row)
            await db.commit()


async def test_list_notifications_returns_seeded_row(client, seeded_notification):
    response = await client.get("/api/v1/notifications", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 200
    ids = [n["id"] for n in response.json()["data"]]
    assert seeded_notification in ids


async def test_mark_read_flips_is_read(client, seeded_notification):
    response = await client.patch(
        f"/api/v1/notifications/{seeded_notification}/read", headers=auth_header(role="EMPLOYEE")
    )
    assert response.status_code == 200
    assert response.json()["data"]["isRead"] is True


async def test_mark_read_for_other_users_notification_404s(client, seeded_notification):
    response = await client.patch(
        f"/api/v1/notifications/{seeded_notification}/read",
        headers=auth_header(role="EMPLOYEE", sub="someone-else-entirely"),
    )
    assert response.status_code == 404


async def test_mark_all_read(client, seeded_notification):
    response = await client.patch("/api/v1/notifications/read-all", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 200

    list_resp = await client.get("/api/v1/notifications", headers=auth_header(role="EMPLOYEE"))
    assert all(n["isRead"] for n in list_resp.json()["data"])

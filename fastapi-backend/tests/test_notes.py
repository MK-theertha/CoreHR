import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.db.base import SessionLocal
from app.db.models import Employee, Note
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def employee_profile(seeded_role_users):
    async with SessionLocal() as db:
        employee = Employee(
            full_name="Notes Tester",
            email="notes-tester@corehr.test",
            status="ACTIVE",
            user_id=_seeded_user_ids["EMPLOYEE"],
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        employee_id = employee.id
    yield employee_id
    async with SessionLocal() as db:
        await db.execute(delete(Note).where(Note.employee_id == employee_id))
        await db.commit()
        row = await db.get(Employee, employee_id)
        if row is not None:
            await db.delete(row)
            await db.commit()


async def test_staff_can_create_and_list_notes(client, employee_profile):
    create_resp = await client.post(
        f"/api/v1/employees/{employee_profile}/notes",
        json={"body": "Discussed Q3 performance goals."},
        headers=auth_header(role="HR_ADMIN"),
    )
    assert create_resp.status_code == 201
    note = create_resp.json()["data"]
    assert note["body"] == "Discussed Q3 performance goals."
    assert note["author"]["id"] is not None

    list_resp = await client.get(f"/api/v1/employees/{employee_profile}/notes", headers=auth_header(role="MANAGER"))
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


async def test_employee_cannot_view_or_create_notes_on_own_record(client, employee_profile):
    list_resp = await client.get(f"/api/v1/employees/{employee_profile}/notes", headers=auth_header(role="EMPLOYEE"))
    assert list_resp.status_code == 403

    create_resp = await client.post(
        f"/api/v1/employees/{employee_profile}/notes",
        json={"body": "Should not be allowed"},
        headers=auth_header(role="EMPLOYEE"),
    )
    assert create_resp.status_code == 403


async def test_staff_can_update_a_note(client, employee_profile):
    create_resp = await client.post(
        f"/api/v1/employees/{employee_profile}/notes",
        json={"body": "Original text"},
        headers=auth_header(role="HR_ADMIN"),
    )
    note_id = create_resp.json()["data"]["id"]

    update_resp = await client.patch(
        f"/api/v1/employees/{employee_profile}/notes/{note_id}",
        json={"body": "Corrected text"},
        headers=auth_header(role="MANAGER"),
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["body"] == "Corrected text"

    list_resp = await client.get(f"/api/v1/employees/{employee_profile}/notes", headers=auth_header(role="SUPER_ADMIN"))
    assert list_resp.json()["data"][0]["body"] == "Corrected text"


async def test_employee_cannot_update_a_note(client, employee_profile):
    create_resp = await client.post(
        f"/api/v1/employees/{employee_profile}/notes",
        json={"body": "Original text"},
        headers=auth_header(role="HR_ADMIN"),
    )
    note_id = create_resp.json()["data"]["id"]

    update_resp = await client.patch(
        f"/api/v1/employees/{employee_profile}/notes/{note_id}",
        json={"body": "Should not be allowed"},
        headers=auth_header(role="EMPLOYEE"),
    )
    assert update_resp.status_code == 403


async def test_staff_can_delete_a_note(client, employee_profile):
    create_resp = await client.post(
        f"/api/v1/employees/{employee_profile}/notes",
        json={"body": "Temporary note"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    note_id = create_resp.json()["data"]["id"]

    delete_resp = await client.delete(
        f"/api/v1/employees/{employee_profile}/notes/{note_id}", headers=auth_header(role="SUPER_ADMIN")
    )
    assert delete_resp.status_code == 200

    list_resp = await client.get(f"/api/v1/employees/{employee_profile}/notes", headers=auth_header(role="SUPER_ADMIN"))
    assert list_resp.json()["data"] == []

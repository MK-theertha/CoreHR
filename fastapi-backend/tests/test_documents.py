from datetime import datetime

import boto3
import pytest
import pytest_asyncio
from moto import mock_aws

import app.core.s3 as s3_module
from app.core.config import settings
from app.db.base import SessionLocal
from app.db.models import Employee, LeaveRequest
from tests.conftest import _seeded_user_ids, auth_header

pytestmark = pytest.mark.asyncio

TEST_BUCKET = "corehr-test-bucket"


@pytest_asyncio.fixture
async def scratch_employee():
    """A throwaway Employee not linked to any User — enough to exercise the
    staff-initiated /employees/{id}/documents endpoints."""
    async with SessionLocal() as db:
        employee = Employee(full_name="Doc Test Employee", email="doc-test-employee@corehr.test", status="ACTIVE")
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


@pytest_asyncio.fixture
async def owned_leave_request(seeded_role_users):
    """A PENDING leave request owned by the seeded EMPLOYEE user, so we can
    test that only its owner (or a manager/admin) can see its documents."""
    employee_user_id = _seeded_user_ids["EMPLOYEE"]
    async with SessionLocal() as db:
        employee = Employee(
            full_name="Leave Doc Owner",
            email="leave-doc-owner@corehr.test",
            status="ACTIVE",
            user_id=employee_user_id,
        )
        db.add(employee)
        await db.flush()
        leave_request = LeaveRequest(
            employee_id=employee.id,
            leave_type="Sick",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 1, 2),
            reason="doc test",
            status="PENDING",
        )
        db.add(leave_request)
        await db.commit()
        employee_id, leave_id = employee.id, leave_request.id
    yield leave_id
    async with SessionLocal() as db:
        lr = await db.get(LeaveRequest, leave_id)
        if lr is not None:
            await db.delete(lr)
        emp = await db.get(Employee, employee_id)
        if emp is not None:
            await db.delete(emp)
        await db.commit()


@pytest.fixture
def s3(monkeypatch):
    """Mocked S3 (moto) with a bucket already created, and the app's S3
    settings pointed at it. Forces a fresh boto3 client so the mock is
    actually in effect (the app caches a client at module scope)."""
    with mock_aws():
        monkeypatch.setattr(settings, "s3_uploads_bucket", TEST_BUCKET)
        monkeypatch.setattr(settings, "aws_region", "us-east-1")
        s3_module._client = None
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket=TEST_BUCKET)
        yield client
        s3_module._client = None


async def test_upload_url_rejects_unsupported_content_type(client, scratch_employee):
    response = await client.post(
        f"/api/v1/employees/{scratch_employee}/documents/upload-url",
        json={"fileName": "malware.exe", "contentType": "application/x-msdownload"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    # Rejected by the Pydantic Literal before it reaches the service. This app
    # maps every validation error to 400, not FastAPI's default 422 — see
    # app/core/errors.py::validation_error_handler.
    assert response.status_code == 400


async def test_upload_url_without_s3_configured_returns_501(client, scratch_employee):
    assert settings.s3_uploads_bucket == ""
    response = await client.post(
        f"/api/v1/employees/{scratch_employee}/documents/upload-url",
        json={"fileName": "id.pdf", "contentType": "application/pdf"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert response.status_code == 501


async def test_upload_url_for_nonexistent_employee_404s(client, s3):
    response = await client.post(
        "/api/v1/employees/does-not-exist/documents/upload-url",
        json={"fileName": "id.pdf", "contentType": "application/pdf"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert response.status_code == 404


async def test_confirm_without_a_real_upload_is_rejected(client, s3, scratch_employee):
    """Never trust the client's say-so: confirming a document that was never
    actually PUT to S3 must fail, not silently create a dangling reference."""
    response = await client.post(
        f"/api/v1/employees/{scratch_employee}/documents/confirm",
        json={"documentId": "fake-doc-id", "fileName": "id.pdf", "contentType": "application/pdf"},
        headers=auth_header(role="SUPER_ADMIN"),
    )
    assert response.status_code == 400
    assert "not found" in response.json()["message"].lower()


async def test_employee_document_full_round_trip(client, s3, scratch_employee):
    # 1. request a pre-signed upload URL
    upload_resp = await client.post(
        f"/api/v1/employees/{scratch_employee}/documents/upload-url",
        json={"fileName": "offer-letter.pdf", "contentType": "application/pdf"},
        headers=auth_header(role="HR_ADMIN"),
    )
    assert upload_resp.status_code == 200
    body = upload_resp.json()["data"]
    document_id = body["documentId"]
    assert body["uploadUrl"].startswith("https://")

    # 2. simulate the client's direct-to-S3 PUT (moto intercepts this via the
    #    same mocked boto3 client, not the presigned URL itself)
    key = f"employees/{scratch_employee}/documents/{document_id}.pdf"
    s3.put_object(Bucket=TEST_BUCKET, Key=key, Body=b"%PDF-1.4 fake offer letter")

    # 3. confirm — this is what actually persists the Document row
    confirm_resp = await client.post(
        f"/api/v1/employees/{scratch_employee}/documents/confirm",
        json={"documentId": document_id, "fileName": "offer-letter.pdf", "contentType": "application/pdf"},
        headers=auth_header(role="HR_ADMIN"),
    )
    assert confirm_resp.status_code == 200
    confirmed = confirm_resp.json()["data"]
    assert confirmed["fileName"] == "offer-letter.pdf"
    assert confirmed["downloadUrl"].startswith("https://")

    # 4. shows up in the list, with a working-shaped download URL
    list_resp = await client.get(
        f"/api/v1/employees/{scratch_employee}/documents", headers=auth_header(role="MANAGER")
    )
    assert list_resp.status_code == 200
    documents = list_resp.json()["data"]
    assert len(documents) == 1
    assert documents[0]["id"] == document_id

    # 5. delete removes both the DB row and the S3 object
    delete_resp = await client.delete(
        f"/api/v1/employees/{scratch_employee}/documents/{document_id}", headers=auth_header(role="HR_ADMIN")
    )
    assert delete_resp.status_code == 200

    list_after = await client.get(
        f"/api/v1/employees/{scratch_employee}/documents", headers=auth_header(role="MANAGER")
    )
    assert list_after.json()["data"] == []
    with pytest.raises(s3.exceptions.ClientError):
        s3.head_object(Bucket=TEST_BUCKET, Key=key)


async def test_leave_document_visible_to_owner_and_managers(client, s3, owned_leave_request):
    owner_resp = await client.get(
        f"/api/v1/leave/{owned_leave_request}/documents", headers=auth_header(role="EMPLOYEE")
    )
    assert owner_resp.status_code == 200

    manager_resp = await client.get(
        f"/api/v1/leave/{owned_leave_request}/documents", headers=auth_header(role="MANAGER")
    )
    assert manager_resp.status_code == 200


async def test_leave_document_hidden_from_other_employees(client, s3, owned_leave_request):
    """A different EMPLOYEE (not the leave request's owner) must not be able
    to tell the leave request even exists."""
    other_employee_token = auth_header(role="EMPLOYEE", sub="someone-else-entirely")
    response = await client.get(f"/api/v1/leave/{owned_leave_request}/documents", headers=other_employee_token)
    assert response.status_code == 404

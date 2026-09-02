import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio

ALL_ROLES = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"]

# Routes reachable by any authenticated user (router-level `protect` only, no `authorize(...)`).
PROTECT_ONLY_ROUTES = [
    ("GET", "/api/v1/auth/me", None),
    ("GET", "/api/v1/dashboard/summary", None),
    ("GET", "/api/v1/departments", None),
    ("GET", "/api/v1/departments/does-not-exist", None),
    ("GET", "/api/v1/employees/me", None),
    ("PATCH", "/api/v1/employees/me", {}),
    ("GET", "/api/v1/leave", None),
    (
        "POST",
        "/api/v1/leave",
        {"leaveType": "Sick", "startDate": "2026-01-01T00:00:00Z", "endDate": "2026-01-02T00:00:00Z", "reason": "test reason"},
    ),
    ("PATCH", "/api/v1/leave/does-not-exist/cancel", None),
    ("GET", "/api/v1/notifications", None),
    ("PATCH", "/api/v1/notifications/read-all", None),
    ("PATCH", "/api/v1/notifications/does-not-exist/read", None),
    ("GET", "/api/v1/employees/me/documents", None),
    (
        "POST",
        "/api/v1/employees/me/documents/upload-url",
        {"fileName": "id.pdf", "contentType": "application/pdf"},
    ),
    (
        "POST",
        "/api/v1/employees/me/documents/confirm",
        {"documentId": "does-not-exist", "fileName": "id.pdf", "contentType": "application/pdf"},
    ),
    ("DELETE", "/api/v1/employees/me/documents/does-not-exist", None),
    ("GET", "/api/v1/leave/does-not-exist/documents", None),
    (
        "POST",
        "/api/v1/leave/does-not-exist/documents/upload-url",
        {"fileName": "note.pdf", "contentType": "application/pdf"},
    ),
    (
        "POST",
        "/api/v1/leave/does-not-exist/documents/confirm",
        {"documentId": "does-not-exist", "fileName": "note.pdf", "contentType": "application/pdf"},
    ),
    ("DELETE", "/api/v1/leave/does-not-exist/documents/does-not-exist", None),
]

# (method, path, body, allowed_roles) for routes guarded by `authorize(...roles)`.
ROLE_RESTRICTED_ROUTES = [
    ("GET", "/api/v1/dashboard/trends", None, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    ("GET", "/api/v1/dashboard/activity", None, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    ("POST", "/api/v1/departments", {"name": "Ops"}, ["SUPER_ADMIN", "HR_ADMIN"]),
    ("PATCH", "/api/v1/departments/does-not-exist", {"name": "Ops"}, ["SUPER_ADMIN", "HR_ADMIN"]),
    ("DELETE", "/api/v1/departments/does-not-exist", None, ["SUPER_ADMIN"]),
    ("GET", "/api/v1/employees", None, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    ("GET", "/api/v1/employees/does-not-exist", None, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    (
        "POST",
        "/api/v1/employees",
        {"fullName": "New Person", "email": "rbac-test@corehr.dev"},
        ["SUPER_ADMIN", "HR_ADMIN"],
    ),
    ("PATCH", "/api/v1/employees/does-not-exist", {"jobTitle": "Engineer"}, ["SUPER_ADMIN", "HR_ADMIN"]),
    ("DELETE", "/api/v1/employees/does-not-exist", None, ["SUPER_ADMIN", "HR_ADMIN"]),
    ("PATCH", "/api/v1/leave/does-not-exist/approve", {}, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    ("PATCH", "/api/v1/leave/does-not-exist/reject", {}, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    ("GET", "/api/v1/organization", None, ["SUPER_ADMIN"]),
    ("PATCH", "/api/v1/organization", {"name": "Acme"}, ["SUPER_ADMIN"]),
    ("GET", "/api/v1/reports/summary", None, ["SUPER_ADMIN"]),
    ("GET", "/api/v1/users/roles", None, ["SUPER_ADMIN"]),
    ("PATCH", "/api/v1/users/does-not-exist/role", {"role": "EMPLOYEE"}, ["SUPER_ADMIN"]),
    (
        "POST",
        "/api/v1/employees/does-not-exist/documents/upload-url",
        {"fileName": "id.pdf", "contentType": "application/pdf"},
        ["SUPER_ADMIN", "HR_ADMIN"],
    ),
    (
        "POST",
        "/api/v1/employees/does-not-exist/documents/confirm",
        {"documentId": "does-not-exist", "fileName": "id.pdf", "contentType": "application/pdf"},
        ["SUPER_ADMIN", "HR_ADMIN"],
    ),
    ("GET", "/api/v1/employees/does-not-exist/documents", None, ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"]),
    (
        "DELETE",
        "/api/v1/employees/does-not-exist/documents/does-not-exist",
        None,
        ["SUPER_ADMIN", "HR_ADMIN"],
    ),
]


async def _request(client, method, path, body):
    return await client.request(method, path, json=body if body is not None else None)


@pytest.mark.parametrize("method,path,body", PROTECT_ONLY_ROUTES)
async def test_protect_only_route_requires_auth(client, method, path, body):
    response = await _request(client, method, path, body)
    assert response.status_code == 401


@pytest.mark.parametrize("method,path,body", PROTECT_ONLY_ROUTES)
async def test_protect_only_route_allows_any_authenticated_role(client, method, path, body):
    response = await client.request(method, path, json=body, headers=auth_header(role="EMPLOYEE"))
    assert response.status_code not in (401, 403)


@pytest.mark.parametrize("method,path,body,allowed_roles", ROLE_RESTRICTED_ROUTES)
async def test_role_restricted_route_requires_auth(client, method, path, body, allowed_roles):
    response = await _request(client, method, path, body)
    assert response.status_code == 401


@pytest.mark.parametrize("method,path,body,allowed_roles", ROLE_RESTRICTED_ROUTES)
async def test_role_restricted_route_rejects_disallowed_role(client, method, path, body, allowed_roles):
    disallowed = next(role for role in ALL_ROLES if role not in allowed_roles)
    response = await client.request(method, path, json=body, headers=auth_header(role=disallowed))
    assert response.status_code == 403
    assert response.json()["message"] == "Forbidden: insufficient permissions"


@pytest.mark.parametrize(
    "method,path,body,role",
    [(m, p, b, role) for m, p, b, roles in ROLE_RESTRICTED_ROUTES for role in roles],
)
async def test_role_restricted_route_allows_permitted_role(client, method, path, body, role):
    response = await client.request(method, path, json=body, headers=auth_header(role=role))
    assert response.status_code not in (401, 403)


async def test_health_is_public(client):
    response = await client.get("/health")
    assert response.status_code == 200


async def test_logout_is_public(client):
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200

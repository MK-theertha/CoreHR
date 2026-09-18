import csv
import io

import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


async def test_dashboard_summary_available_to_any_authenticated_user(client):
    response = await client.get("/api/v1/dashboard/summary", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 200


async def test_dashboard_summary_org_scope_includes_attendance(client):
    response = await client.get("/api/v1/dashboard/summary", headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["scope"] == "ORGANIZATION"
    assert "presentToday" in data
    assert "onLeaveToday" in data
    assert data["presentToday"] == data["activeEmployees"] - data["onLeaveToday"]


async def test_trends_requires_elevated_role(client):
    response = await client.get("/api/v1/dashboard/trends", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 403


async def test_trends_returns_expected_shape(client):
    response = await client.get("/api/v1/dashboard/trends", headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data.keys()) == {"employeeGrowth", "monthlyHiring", "leaveTrends"}


async def test_activity_requires_elevated_role(client):
    response = await client.get("/api/v1/dashboard/activity", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 403


async def test_trends_export_requires_elevated_role(client):
    response = await client.get("/api/v1/dashboard/trends/export", headers=auth_header(role="EMPLOYEE"))
    assert response.status_code == 403


async def test_trends_export_returns_csv(client):
    response = await client.get("/api/v1/dashboard/trends/export", headers=auth_header(role="HR_ADMIN"))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(response.text)))
    section_markers = [row[0] for row in rows if row and row[0].startswith("## ")]
    assert section_markers == ["## employeeGrowth", "## monthlyHiring", "## leaveTrends"]

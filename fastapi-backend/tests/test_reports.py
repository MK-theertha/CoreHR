import csv
import io

import pytest

from tests.conftest import auth_header

pytestmark = pytest.mark.asyncio


async def test_summary_requires_super_admin(client):
    response = await client.get("/api/v1/reports/summary", headers=auth_header(role="HR_ADMIN"))
    assert response.status_code == 403


async def test_summary_returns_expected_shape(client):
    response = await client.get("/api/v1/reports/summary", headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    data = response.json()["data"]
    assert set(data.keys()) == {"departmentBreakdown", "employeesByStatus", "leaveRequestsByStatus", "usersByRole"}


async def test_summary_export_requires_super_admin(client):
    response = await client.get("/api/v1/reports/summary/export", headers=auth_header(role="MANAGER"))
    assert response.status_code == 403


async def test_summary_export_returns_csv(client):
    response = await client.get("/api/v1/reports/summary/export", headers=auth_header(role="SUPER_ADMIN"))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(response.text)))
    section_markers = [row[0] for row in rows if row and row[0].startswith("## ")]
    assert section_markers == [
        "## departmentBreakdown",
        "## employeesByStatus",
        "## leaveRequestsByStatus",
        "## usersByRole",
    ]

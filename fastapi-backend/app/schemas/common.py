from typing import Any


def ok(data: Any) -> dict:
    return {"success": True, "data": data}


def ok_paginated(data: Any, *, total: int, page: int, page_size: int) -> dict:
    return {"success": True, "data": data, "meta": {"total": total, "page": page, "pageSize": page_size}}

from typing import Literal

from pydantic import BaseModel

RoleName = Literal["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"]


class UpdateRoleRequest(BaseModel):
    role: RoleName

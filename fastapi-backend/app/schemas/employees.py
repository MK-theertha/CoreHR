from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

EmploymentStatus = Literal["ACTIVE", "PROBATION", "INACTIVE", "TERMINATED"]


class EmployeeCreateRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    email: EmailStr
    departmentId: str | None = None
    jobTitle: str | None = Field(default=None, max_length=80)
    status: EmploymentStatus = "ACTIVE"
    phone: str | None = Field(default=None, max_length=30)
    gender: str | None = Field(default=None, max_length=30)
    dateOfBirth: datetime | None = None
    joiningDate: datetime | None = None


class EmployeeUpdateRequest(BaseModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    departmentId: str | None = None
    jobTitle: str | None = Field(default=None, max_length=80)
    status: EmploymentStatus | None = None
    phone: str | None = Field(default=None, max_length=30)
    gender: str | None = Field(default=None, max_length=30)
    dateOfBirth: datetime | None = None
    joiningDate: datetime | None = None


class EmployeeMeUpdateRequest(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    gender: str | None = Field(default=None, max_length=30)
    dateOfBirth: datetime | None = None

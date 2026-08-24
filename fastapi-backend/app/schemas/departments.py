from pydantic import BaseModel, Field


class CreateDepartmentRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class UpdateDepartmentRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)

from datetime import datetime

from pydantic import BaseModel, Field


class CreateLeaveRequest(BaseModel):
    leaveType: str = Field(min_length=2, max_length=80)
    startDate: datetime
    endDate: datetime
    reason: str = Field(min_length=2, max_length=500)


class DecideLeaveRequest(BaseModel):
    comments: str | None = Field(default=None, max_length=500)

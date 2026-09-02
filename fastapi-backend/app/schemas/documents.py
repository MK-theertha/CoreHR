from typing import Literal

from pydantic import BaseModel, Field

DocumentContentType = Literal[
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]


class DocumentUploadUrlRequest(BaseModel):
    fileName: str = Field(min_length=1, max_length=255)
    contentType: DocumentContentType


class DocumentConfirmRequest(BaseModel):
    documentId: str
    fileName: str = Field(min_length=1, max_length=255)
    contentType: DocumentContentType

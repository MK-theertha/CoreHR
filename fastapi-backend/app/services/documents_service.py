from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import s3
from app.core.errors import AppError
from app.core.security import new_cuid
from app.db.models import Document
from app.services import audit_service
from app.services.audit_service import Actor

EntityType = Literal["Employee", "LeaveRequest"]

# Broader than the profile-image allowlist (app/services/employees_service.py) —
# documents cover things like ID scans, medical certificates, offer letters.
DOCUMENT_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

_KEY_PREFIX = {"Employee": "employees", "LeaveRequest": "leave-requests"}


def _document_key(entity_type: EntityType, entity_id: str, document_id: str, content_type: str) -> str:
    ext = DOCUMENT_CONTENT_TYPES[content_type]
    return f"{_KEY_PREFIX[entity_type]}/{entity_id}/documents/{document_id}.{ext}"


def _serialize(document: Document) -> dict:
    return {
        "id": document.id,
        "fileName": document.file_name,
        "contentType": document.content_type,
        "sizeBytes": document.size_bytes,
        "downloadUrl": s3.generate_presigned_get_url(document.s3_key),
        "uploadedBy": document.uploaded_by,
        "createdAt": document.created_at,
    }


def create_upload_url(*, entity_type: EntityType, entity_id: str, content_type: str) -> dict:
    if content_type not in DOCUMENT_CONTENT_TYPES:
        raise AppError("Unsupported file type", 400)

    document_id = new_cuid()
    key = _document_key(entity_type, entity_id, document_id, content_type)
    return {
        "documentId": document_id,
        "uploadUrl": s3.generate_presigned_put_url(key, content_type),
        "expiresIn": s3.PRESIGNED_URL_TTL_SECONDS,
    }


async def confirm_upload(
    db: AsyncSession,
    *,
    entity_type: EntityType,
    entity_id: str,
    document_id: str,
    file_name: str,
    content_type: str,
    actor: Actor | None,
) -> dict:
    if content_type not in DOCUMENT_CONTENT_TYPES:
        raise AppError("Unsupported file type", 400)

    # Recompute the key server-side rather than trusting one from the client —
    # same principle as the profile-image flow.
    key = _document_key(entity_type, entity_id, document_id, content_type)
    if not s3.object_exists(key):
        raise AppError("Upload not found — try uploading again", 400)

    document = Document(
        id=document_id,
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=file_name,
        content_type=content_type,
        s3_key=key,
        uploaded_by=actor.user_id if actor else None,
    )
    db.add(document)

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_DOCUMENT_UPLOADED" if entity_type == "Employee" else "LEAVE_DOCUMENT_UPLOADED",
        entity_type=entity_type,
        entity_id=entity_id,
        metadata={"documentId": document_id, "fileName": file_name},
    )

    await db.commit()
    return _serialize(document)


async def list_for_entity(db: AsyncSession, *, entity_type: EntityType, entity_id: str) -> list[dict]:
    documents = (
        await db.execute(
            select(Document)
            .where(Document.entity_type == entity_type, Document.entity_id == entity_id)
            .order_by(Document.created_at.desc())
        )
    ).scalars().all()
    return [_serialize(d) for d in documents]


async def delete_document(
    db: AsyncSession, *, entity_type: EntityType, entity_id: str, document_id: str, actor: Actor | None
) -> None:
    document = (
        await db.execute(
            select(Document).where(
                Document.id == document_id,
                Document.entity_type == entity_type,
                Document.entity_id == entity_id,
            )
        )
    ).scalar_one_or_none()
    if document is None:
        raise AppError("Document not found", 404)

    s3.delete_object(document.s3_key)

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_DOCUMENT_DELETED" if entity_type == "Employee" else "LEAVE_DOCUMENT_DELETED",
        entity_type=entity_type,
        entity_id=entity_id,
        metadata={"documentId": document_id, "fileName": document.file_name},
    )

    await db.delete(document)
    await db.commit()

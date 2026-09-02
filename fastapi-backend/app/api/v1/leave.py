from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.documents import DocumentConfirmRequest, DocumentUploadUrlRequest
from app.schemas.leave import CreateLeaveRequest, DecideLeaveRequest
from app.services import documents_service, leave_service
from app.services.audit_service import Actor

router = APIRouter(dependencies=[Depends(get_current_user)])


def _actor(request: Request, user: CurrentUser) -> Actor:
    return Actor(user_id=user.id, ip_address=request.client.host if request.client else None)


@router.get("")
async def list_leave_requests(
    employeeId: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.list_for_user(db, user, employeeId))


@router.post("")
async def create_leave_request(
    request: Request,
    body: CreateLeaveRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.create(db, user.id, body, _actor(request, user)))


@router.patch("/{leave_id}/approve")
async def approve_leave_request(
    leave_id: str,
    request: Request,
    body: DecideLeaveRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER")),
):
    return ok(await leave_service.decide(db, leave_id, user.id, "APPROVED", body.comments, _actor(request, user)))


@router.patch("/{leave_id}/reject")
async def reject_leave_request(
    leave_id: str,
    request: Request,
    body: DecideLeaveRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_roles("SUPER_ADMIN", "HR_ADMIN", "MANAGER")),
):
    return ok(await leave_service.decide(db, leave_id, user.id, "REJECTED", body.comments, _actor(request, user)))


@router.patch("/{leave_id}/cancel")
async def cancel_leave_request(
    leave_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return ok(await leave_service.cancel(db, leave_id, user.id, _actor(request, user)))


@router.post("/{leave_id}/documents/upload-url")
async def create_leave_document_upload_url(
    leave_id: str,
    body: DocumentUploadUrlRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await leave_service.get_visible_leave_request(db, leave_id, user)
    result = documents_service.create_upload_url(
        entity_type="LeaveRequest", entity_id=leave_id, content_type=body.contentType
    )
    return ok(result)


@router.post("/{leave_id}/documents/confirm")
async def confirm_leave_document(
    leave_id: str,
    request: Request,
    body: DocumentConfirmRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await leave_service.get_visible_leave_request(db, leave_id, user)
    result = await documents_service.confirm_upload(
        db,
        entity_type="LeaveRequest",
        entity_id=leave_id,
        document_id=body.documentId,
        file_name=body.fileName,
        content_type=body.contentType,
        actor=_actor(request, user),
    )
    return ok(result)


@router.get("/{leave_id}/documents")
async def list_leave_documents(
    leave_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await leave_service.get_visible_leave_request(db, leave_id, user)
    return ok(await documents_service.list_for_entity(db, entity_type="LeaveRequest", entity_id=leave_id))


@router.delete("/{leave_id}/documents/{document_id}")
async def delete_leave_document(
    leave_id: str,
    document_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    leave_request = await leave_service.get_visible_leave_request(db, leave_id, user)
    if user.role not in leave_service.CAN_MANAGE and leave_request.status != "PENDING":
        raise AppError("Only pending leave requests can have documents removed", 400)
    await documents_service.delete_document(
        db, entity_type="LeaveRequest", entity_id=leave_id, document_id=document_id, actor=_actor(request, user)
    )
    return ok(None)

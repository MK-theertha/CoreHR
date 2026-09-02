from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.schemas.common import ok
from app.schemas.documents import DocumentConfirmRequest, DocumentUploadUrlRequest
from app.schemas.employees import (
    EmployeeCreateRequest,
    EmployeeMeUpdateRequest,
    EmployeeUpdateRequest,
    ProfileImageUploadUrlRequest,
)
from app.services import documents_service, employees_service
from app.services.audit_service import Actor

router = APIRouter(dependencies=[Depends(get_current_user)])

STAFF_ROLES = ("SUPER_ADMIN", "HR_ADMIN", "MANAGER")
ADMIN_ROLES = ("SUPER_ADMIN", "HR_ADMIN")


def _actor(request: Request, user: CurrentUser) -> Actor:
    return Actor(user_id=user.id, ip_address=request.client.host if request.client else None)


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await employees_service.get_me(db, user.id))


@router.patch("/me")
async def update_me(
    request: Request,
    body: EmployeeMeUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump(exclude_unset=True)
    result = await employees_service.update_me(db, user.id, payload, _actor(request, user))
    return ok(result)


@router.post("/me/profile-image/upload-url")
async def create_profile_image_upload_url(
    body: ProfileImageUploadUrlRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await employees_service.create_profile_image_upload_url(db, user.id, body.contentType)
    return ok(result)


@router.post("/me/profile-image/confirm")
async def confirm_profile_image(
    request: Request,
    body: ProfileImageUploadUrlRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await employees_service.confirm_profile_image(db, user.id, body.contentType, _actor(request, user))
    return ok(result)


@router.post("/me/documents/upload-url")
async def create_my_document_upload_url(
    body: DocumentUploadUrlRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    employee = await employees_service.get_me(db, user.id)
    result = documents_service.create_upload_url(
        entity_type="Employee", entity_id=employee["id"], content_type=body.contentType
    )
    return ok(result)


@router.post("/me/documents/confirm")
async def confirm_my_document(
    request: Request,
    body: DocumentConfirmRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    employee = await employees_service.get_me(db, user.id)
    result = await documents_service.confirm_upload(
        db,
        entity_type="Employee",
        entity_id=employee["id"],
        document_id=body.documentId,
        file_name=body.fileName,
        content_type=body.contentType,
        actor=_actor(request, user),
    )
    return ok(result)


@router.get("/me/documents")
async def list_my_documents(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    employee = await employees_service.get_me(db, user.id)
    return ok(await documents_service.list_for_entity(db, entity_type="Employee", entity_id=employee["id"]))


@router.delete("/me/documents/{document_id}")
async def delete_my_document(
    document_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    employee = await employees_service.get_me(db, user.id)
    await documents_service.delete_document(
        db, entity_type="Employee", entity_id=employee["id"], document_id=document_id, actor=_actor(request, user)
    )
    return ok(None)


@router.get("", dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def list_employees(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return ok(await employees_service.list_employees(db, user))


@router.get("/{employee_id}", dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def get_employee(employee_id: str, db: AsyncSession = Depends(get_db)):
    employee = await employees_service.get_employee(db, employee_id)
    if employee is None:
        raise AppError("Employee not found", 404)
    return ok(employee)


@router.post("/{employee_id}/documents/upload-url", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def create_employee_document_upload_url(
    employee_id: str, body: DocumentUploadUrlRequest, db: AsyncSession = Depends(get_db)
):
    if await employees_service.get_employee(db, employee_id) is None:
        raise AppError("Employee not found", 404)
    result = documents_service.create_upload_url(
        entity_type="Employee", entity_id=employee_id, content_type=body.contentType
    )
    return ok(result)


@router.post("/{employee_id}/documents/confirm", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def confirm_employee_document(
    employee_id: str,
    request: Request,
    body: DocumentConfirmRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if await employees_service.get_employee(db, employee_id) is None:
        raise AppError("Employee not found", 404)
    result = await documents_service.confirm_upload(
        db,
        entity_type="Employee",
        entity_id=employee_id,
        document_id=body.documentId,
        file_name=body.fileName,
        content_type=body.contentType,
        actor=_actor(request, user),
    )
    return ok(result)


@router.get("/{employee_id}/documents", dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def list_employee_documents(employee_id: str, db: AsyncSession = Depends(get_db)):
    if await employees_service.get_employee(db, employee_id) is None:
        raise AppError("Employee not found", 404)
    return ok(await documents_service.list_for_entity(db, entity_type="Employee", entity_id=employee_id))


@router.delete("/{employee_id}/documents/{document_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def delete_employee_document(
    employee_id: str,
    document_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await documents_service.delete_document(
        db, entity_type="Employee", entity_id=employee_id, document_id=document_id, actor=_actor(request, user)
    )
    return ok(None)


@router.post("", status_code=201, dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def create_employee(
    request: Request,
    body: EmployeeCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump()
    result = await employees_service.create_employee(db, payload, _actor(request, user))
    return ok(result)


@router.patch("/{employee_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def update_employee(
    employee_id: str,
    request: Request,
    body: EmployeeUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump(exclude_unset=True)
    result = await employees_service.update_employee(db, employee_id, payload, _actor(request, user))
    return ok(result)


@router.delete("/{employee_id}", dependencies=[Depends(require_roles(*ADMIN_ROLES))])
async def delete_employee(
    employee_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await employees_service.delete_employee(db, employee_id, _actor(request, user))
    return ok(None)

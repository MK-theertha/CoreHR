from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.core.util import to_naive_utc
from app.db.models import Employee, LeaveRequest
from app.services import audit_service, dashboard_service, notification_service
from app.services.audit_service import Actor

CAN_MANAGE = {"SUPER_ADMIN", "HR_ADMIN", "MANAGER"}


def _serialize_employee(employee: Employee) -> dict:
    return {
        "id": employee.id,
        "fullName": employee.full_name,
        "email": employee.email,
        "departmentId": employee.department_id,
        "userId": employee.user_id,
    }


def _serialize(leave_request: LeaveRequest) -> dict:
    return {
        "id": leave_request.id,
        "employeeId": leave_request.employee_id,
        "leaveType": leave_request.leave_type,
        "startDate": leave_request.start_date,
        "endDate": leave_request.end_date,
        "reason": leave_request.reason,
        "status": leave_request.status,
        "approvedBy": leave_request.approved_by,
        "comments": leave_request.comments,
        "createdAt": leave_request.created_at,
        "updatedAt": leave_request.updated_at,
        "employee": _serialize_employee(leave_request.employee) if leave_request.employee is not None else None,
    }


async def list_for_user(db: AsyncSession, user, employee_id: str | None) -> list[dict]:
    query = select(LeaveRequest).options(selectinload(LeaveRequest.employee)).order_by(LeaveRequest.created_at.desc())

    if user.role in CAN_MANAGE:
        if employee_id is not None:
            query = query.where(LeaveRequest.employee_id == employee_id)
    else:
        own_employee = (
            await db.execute(select(Employee).where(Employee.user_id == user.id))
        ).scalar_one_or_none()
        if own_employee is None:
            return []
        query = query.where(LeaveRequest.employee_id == own_employee.id)

    leave_requests = (await db.execute(query)).scalars().all()
    return [_serialize(lr) for lr in leave_requests]


async def create(db: AsyncSession, user_id: str, payload, actor: Actor | None) -> dict:
    own_employee = (
        await db.execute(select(Employee).where(Employee.user_id == user_id))
    ).scalar_one_or_none()
    if own_employee is None:
        raise AppError("No employee profile linked to this account", 404)

    if payload.startDate > payload.endDate:
        raise AppError("Start date must be before end date", 400)

    leave_request = LeaveRequest(
        employee_id=own_employee.id,
        leave_type=payload.leaveType,
        start_date=to_naive_utc(payload.startDate),
        end_date=to_naive_utc(payload.endDate),
        reason=payload.reason,
        status="PENDING",
    )
    db.add(leave_request)
    await db.flush()

    audit_service.record(
        db,
        actor,
        action="LEAVE_REQUESTED",
        entity_type="LeaveRequest",
        entity_id=leave_request.id,
        metadata={
            "leaveType": payload.leaveType,
            "startDate": payload.startDate.isoformat(),
            "endDate": payload.endDate.isoformat(),
        },
    )

    await db.commit()
    await db.refresh(leave_request, attribute_names=["employee"])
    await dashboard_service.invalidate_org_summary_cache()
    await dashboard_service.invalidate_personal_summary_cache(user_id)
    return _serialize(leave_request)


async def decide(
    db: AsyncSession,
    leave_id: str,
    approver_user_id: str,
    status: Literal["APPROVED", "REJECTED"],
    comments: str | None,
    actor: Actor | None,
) -> dict:
    leave_request = (
        await db.execute(
            select(LeaveRequest)
            .options(selectinload(LeaveRequest.employee))
            .where(LeaveRequest.id == leave_id)
        )
    ).scalar_one_or_none()
    if leave_request is None:
        raise AppError("Leave request not found", 404)

    if leave_request.status != "PENDING":
        raise AppError("Only pending leave requests can be decided", 400)

    if leave_request.employee.user_id == approver_user_id:
        raise AppError("You cannot approve or reject your own leave request", 403)

    leave_request.status = status
    leave_request.approved_by = approver_user_id
    leave_request.comments = comments

    audit_service.record(
        db,
        actor,
        action="LEAVE_APPROVED" if status == "APPROVED" else "LEAVE_REJECTED",
        entity_type="LeaveRequest",
        entity_id=leave_id,
        metadata={"comments": comments},
    )

    if leave_request.employee.user_id is not None:
        decided_word = "approved" if status == "APPROVED" else "rejected"
        message = f"Your {leave_request.leave_type} request has been {decided_word}."
        if comments:
            message += f" Comment: {comments}"
        notification_service.create(
            db,
            user_id=leave_request.employee.user_id,
            title="Leave request approved" if status == "APPROVED" else "Leave request rejected",
            message=message,
            type="LEAVE",
        )

    await db.commit()
    await db.refresh(leave_request, attribute_names=["employee"])
    await dashboard_service.invalidate_org_summary_cache()
    # Affects both the deciding-on employee's pending/approved counts and
    # their unread-notifications count (they were just notified above).
    await dashboard_service.invalidate_personal_summary_cache(leave_request.employee.user_id)
    return _serialize(leave_request)


async def cancel(db: AsyncSession, leave_id: str, user_id: str, actor: Actor | None) -> dict:
    own_employee = (
        await db.execute(select(Employee).where(Employee.user_id == user_id))
    ).scalar_one_or_none()
    if own_employee is None:
        raise AppError("No employee profile linked to this account", 404)

    leave_request = (
        await db.execute(
            select(LeaveRequest)
            .options(selectinload(LeaveRequest.employee))
            .where(LeaveRequest.id == leave_id)
        )
    ).scalar_one_or_none()
    if leave_request is None or leave_request.employee_id != own_employee.id:
        raise AppError("Leave request not found", 404)

    if leave_request.status != "PENDING":
        raise AppError("Only pending leave requests can be cancelled", 400)

    leave_request.status = "CANCELLED"

    audit_service.record(
        db,
        actor,
        action="LEAVE_CANCELLED",
        entity_type="LeaveRequest",
        entity_id=leave_id,
    )

    await db.commit()
    await db.refresh(leave_request, attribute_names=["employee"])
    await dashboard_service.invalidate_org_summary_cache()
    await dashboard_service.invalidate_personal_summary_cache(user_id)
    return _serialize(leave_request)

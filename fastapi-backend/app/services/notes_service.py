from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.db.models import Note
from app.services import audit_service
from app.services.audit_service import Actor


def _serialize(note: Note) -> dict:
    return {
        "id": note.id,
        "employeeId": note.employee_id,
        "body": note.body,
        "createdAt": note.created_at,
        "author": {"id": note.author.id, "name": note.author.name} if note.author else None,
    }


async def list_for_employee(db: AsyncSession, employee_id: str) -> list[dict]:
    notes = (
        await db.execute(
            select(Note)
            .options(selectinload(Note.author))
            .where(Note.employee_id == employee_id)
            .order_by(Note.created_at.desc())
        )
    ).scalars().all()
    return [_serialize(note) for note in notes]


async def create(db: AsyncSession, *, employee_id: str, body: str, actor: Actor | None) -> dict:
    note = Note(employee_id=employee_id, author_id=actor.user_id if actor else None, body=body)
    db.add(note)
    await db.flush()

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_NOTE_CREATED",
        entity_type="Employee",
        entity_id=employee_id,
        metadata={"noteId": note.id},
    )

    await db.commit()
    await db.refresh(note, attribute_names=["author"])
    return _serialize(note)


async def delete(db: AsyncSession, *, employee_id: str, note_id: str, actor: Actor | None) -> None:
    note = (
        await db.execute(select(Note).where(Note.id == note_id, Note.employee_id == employee_id))
    ).scalar_one_or_none()
    if note is None:
        raise AppError("Note not found", 404)

    audit_service.record(
        db,
        actor,
        action="EMPLOYEE_NOTE_DELETED",
        entity_type="Employee",
        entity_id=employee_id,
        metadata={"noteId": note_id},
    )

    await db.delete(note)
    await db.commit()

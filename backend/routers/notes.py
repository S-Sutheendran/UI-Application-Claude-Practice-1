from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid
from database import get_db
from models.note import Note
from models.user import User
from schemas.note import NoteCreate, NoteUpdate, NoteResponse
from core.dependencies import get_current_user
from core.exceptions import NotFoundError, ForbiddenError
from services.productivity_service import update_daily_stats

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
async def list_notes(
    pinned: Optional[bool] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Note).where(Note.user_id == user.id)
    if pinned is not None:
        q = q.where(Note.pinned == pinned)
    if search:
        q = q.where(Note.title.ilike(f"%{search}%") | Note.content.ilike(f"%{search}%"))
    q = q.order_by(Note.pinned.desc(), Note.updated_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    notes = result.scalars().all()
    if tag:
        notes = [n for n in notes if tag.lower() in (n.tags or [])]
    return notes


@router.post("", response_model=NoteResponse, status_code=201)
async def create_note(body: NoteCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    note = Note(id=str(uuid.uuid4()), user_id=user.id, **body.model_dump())
    db.add(note)
    await db.flush()
    await update_daily_stats(user.id, db, notes_created=1)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("Note", note_id)
    if note.user_id != user.id:
        raise ForbiddenError()
    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str, body: NoteUpdate,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("Note", note_id)
    if note.user_id != user.id:
        raise ForbiddenError()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/{note_id}/pin", response_model=NoteResponse)
async def toggle_pin(note_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("Note", note_id)
    if note.user_id != user.id:
        raise ForbiddenError()
    note.pinned = not note.pinned
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("Note", note_id)
    if note.user_id != user.id:
        raise ForbiddenError()
    await db.delete(note)
    await db.commit()

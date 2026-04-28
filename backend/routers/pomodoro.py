from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date, timezone
from typing import Optional
import uuid
from database import get_db
from models.user import User
from models.pomodoro import PomodoroSettings, PomodoroSession
from schemas.pomodoro import (
    PomodoroSettingsResponse, PomodoroSettingsUpdate,
    PomodoroSessionCreate, PomodoroSessionResponse, PomodoroSessionAggregation,
)
from core.dependencies import get_current_user
from services.productivity_service import update_daily_stats

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.get("/settings", response_model=PomodoroSettingsResponse)
async def get_settings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PomodoroSettings).where(PomodoroSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = PomodoroSettings(id=str(uuid.uuid4()), user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("/settings", response_model=PomodoroSettingsResponse)
async def update_settings(
    body: PomodoroSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PomodoroSettings).where(PomodoroSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = PomodoroSettings(id=str(uuid.uuid4()), user_id=user.id)
        db.add(settings)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.post("/sessions", response_model=PomodoroSessionResponse, status_code=201)
async def log_session(
    body: PomodoroSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    completed_at = body.completed_at or datetime.now(timezone.utc)
    session = PomodoroSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        task_id=body.task_id,
        type=body.type,
        duration=body.duration,
        completed_at=completed_at,
        hour_of_day=completed_at.hour,
        day_of_week=completed_at.weekday(),
    )
    db.add(session)
    await db.flush()

    if body.type == "focus":
        await update_daily_stats(user.id, db, focus_minutes=body.duration, pomodoros=1)

    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[PomodoroSessionResponse])
async def list_sessions(
    session_type: Optional[str] = None,
    task_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(PomodoroSession).where(PomodoroSession.user_id == user.id)
    if session_type:
        q = q.where(PomodoroSession.type == session_type)
    if task_id:
        q = q.where(PomodoroSession.task_id == task_id)
    if date_from:
        q = q.where(PomodoroSession.completed_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.where(PomodoroSession.completed_at <= datetime.combine(date_to, datetime.max.time()))
    q = q.order_by(PomodoroSession.completed_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/sessions/aggregate", response_model=PomodoroSessionAggregation)
async def aggregate_sessions(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_filters = [
        PomodoroSession.user_id == user.id,
        PomodoroSession.type == "focus",
    ]
    if date_from:
        base_filters.append(PomodoroSession.completed_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        base_filters.append(PomodoroSession.completed_at <= datetime.combine(date_to, datetime.max.time()))

    total_q = select(
        func.count(PomodoroSession.id),
        func.coalesce(func.sum(PomodoroSession.duration), 0),
    ).where(*base_filters)
    row = (await db.execute(total_q)).one()
    total_sessions, total_minutes = row[0], row[1]

    hour_q = (
        select(PomodoroSession.hour_of_day, func.count(PomodoroSession.id).label("cnt"))
        .where(*base_filters)
        .group_by(PomodoroSession.hour_of_day)
        .order_by(func.count(PomodoroSession.id).desc())
        .limit(1)
    )
    hour_row = (await db.execute(hour_q)).first()
    best_hour = hour_row[0] if hour_row else None

    day_q = (
        select(PomodoroSession.day_of_week, func.count(PomodoroSession.id).label("cnt"))
        .where(*base_filters)
        .group_by(PomodoroSession.day_of_week)
        .order_by(func.count(PomodoroSession.id).desc())
        .limit(1)
    )
    day_row = (await db.execute(day_q)).first()
    best_day = day_row[0] if day_row else None

    avg_per_day = round(total_sessions / 7, 2) if total_sessions else 0.0

    return PomodoroSessionAggregation(
        total_sessions=total_sessions,
        total_focus_minutes=total_minutes,
        average_sessions_per_day=avg_per_day,
        best_hour_of_day=best_hour,
        best_day_of_week=best_day,
    )

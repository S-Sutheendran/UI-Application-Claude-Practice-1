from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from typing import Optional
from database import get_db
from models.user import User
from models.stats import DailyStats
from schemas.stats import DailyStatsResponse, DailyStatsRecord, StatsIncrementRequest, AllTimeSummary
from core.dependencies import get_current_user
from services.productivity_service import update_daily_stats, get_all_time_summary

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/today", response_model=DailyStatsResponse)
async def get_today(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stats = await update_daily_stats(user.id, db)
    return stats


@router.get("/summary", response_model=AllTimeSummary)
async def get_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_all_time_summary(user.id, db)


@router.get("/daily", response_model=list[DailyStatsResponse])
async def get_daily_range(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(30, le=365),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(DailyStats).where(DailyStats.user_id == user.id)
    if date_from:
        q = q.where(DailyStats.date >= date_from)
    if date_to:
        q = q.where(DailyStats.date <= date_to)
    q = q.order_by(DailyStats.date.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/record", response_model=DailyStatsResponse, status_code=201)
async def record_stats(
    body: DailyStatsRecord,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats = await update_daily_stats(
        user.id, db,
        focus_minutes=body.focus_minutes,
        pomodoros=body.pomodoros_completed,
        tasks_completed=body.tasks_completed,
        notes_created=body.notes_created,
    )
    return stats


@router.patch("/today/increment", response_model=DailyStatsResponse)
async def increment_today(
    body: StatsIncrementRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats = await update_daily_stats(
        user.id, db,
        focus_minutes=body.focus_minutes,
        pomodoros=body.pomodoros_completed,
        tasks_completed=body.tasks_completed,
        notes_created=body.notes_created,
    )
    return stats

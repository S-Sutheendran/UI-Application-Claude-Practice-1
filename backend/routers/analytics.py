from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from typing import Optional, Literal
from database import get_db
from models.user import User
from core.dependencies import get_current_user
from services.analytics_service import (
    get_trend_data,
    get_focus_patterns,
    get_project_health,
    get_comparative_report,
    get_streak_report,
    get_task_velocity,
    get_correlation_report,
    get_priority_distribution,
    get_historical_monthly,
    get_full_report,
)
from schemas.analytics import (
    TrendReport,
    FocusPatternReport,
    ProjectHealthReport,
    ComparativeReport,
    StreakReport,
    TaskVelocityReport,
    CorrelationReport,
    PriorityDistributionReport,
    HistoricalSummary,
    FullAnalyticsReport,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _default_range(days: int = 30):
    end = date.today()
    start = end - timedelta(days=days)
    return start, end


@router.get("/trends", response_model=TrendReport)
async def daily_trends(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start, end = date_from or _default_range(30)[0], date_to or date.today()
    return await get_trend_data(user.id, db, "daily", start, end)


@router.get("/trends/weekly", response_model=TrendReport)
async def weekly_trends(
    weeks: int = Query(12, ge=1, le=52),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    end = date.today()
    start = end - timedelta(weeks=weeks)
    return await get_trend_data(user.id, db, "weekly", start, end)


@router.get("/trends/monthly", response_model=TrendReport)
async def monthly_trends(
    months: int = Query(12, ge=1, le=24),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    end = date.today()
    start = end - timedelta(days=months * 30)
    return await get_trend_data(user.id, db, "monthly", start, end)


@router.get("/focus-patterns", response_model=FocusPatternReport)
async def focus_patterns(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_focus_patterns(user.id, db)


@router.get("/project-health", response_model=list[ProjectHealthReport])
async def all_project_health(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_project_health(user.id, db)


@router.get("/project-health/{project_id}", response_model=ProjectHealthReport)
async def single_project_health(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = await get_project_health(user.id, db, project_id=project_id)
    return results[0]


@router.get("/velocity", response_model=TaskVelocityReport)
async def task_velocity(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_task_velocity(user.id, db)


@router.get("/streaks", response_model=StreakReport)
async def streaks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_streak_report(user.id, db)


@router.get("/comparative", response_model=ComparativeReport)
async def comparative(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_comparative_report(user.id, db)


@router.get("/priority-distribution", response_model=PriorityDistributionReport)
async def priority_distribution(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_priority_distribution(user.id, db)


@router.get("/correlations", response_model=CorrelationReport)
async def correlations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_correlation_report(user.id, db)


@router.get("/historical", response_model=list[HistoricalSummary])
async def historical_monthly(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_historical_monthly(user.id, db)


@router.get("/report", response_model=FullAnalyticsReport)
async def full_report(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_full_report(user.id, db)

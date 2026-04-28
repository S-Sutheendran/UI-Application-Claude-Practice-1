"""
Productivity Service — business logic for stats, streaks, scores, and recurring tasks.
Called by multiple routers. Keeps routers thin.
"""
from datetime import datetime, date, timedelta
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, insert
from models.stats import DailyStats
from models.task import Task
from config import settings


async def get_or_create_today_stats(user_id: str, db: AsyncSession) -> DailyStats:
    today = date.today()
    result = await db.execute(
        select(DailyStats).where(DailyStats.user_id == user_id, DailyStats.date == today)
    )
    row = result.scalar_one_or_none()
    if not row:
        row = DailyStats(
            id=str(uuid.uuid4()),
            user_id=user_id,
            date=today,
            focus_minutes=0,
            pomodoros=0,
            tasks_completed=0,
            notes_created=0,
            productivity_score=0.0,
        )
        db.add(row)
        await db.flush()
    return row


async def update_daily_stats(
    user_id: str,
    db: AsyncSession,
    focus_minutes: int = 0,
    pomodoros: int = 0,
    tasks_completed: int = 0,
    notes_created: int = 0,
) -> DailyStats:
    row = await get_or_create_today_stats(user_id, db)
    row.focus_minutes += focus_minutes
    row.pomodoros += pomodoros
    row.tasks_completed += tasks_completed
    row.notes_created += notes_created

    streak = await compute_streak(user_id, db)
    row.productivity_score = settings.compute_productivity_score(
        row.focus_minutes, row.pomodoros, row.tasks_completed, streak
    )
    await db.commit()
    await db.refresh(row)
    return row


async def compute_streak(user_id: str, db: AsyncSession) -> int:
    """Count consecutive active days ending today or yesterday."""
    result = await db.execute(
        select(DailyStats.date)
        .where(
            DailyStats.user_id == user_id,
            (DailyStats.focus_minutes > 0) | (DailyStats.tasks_completed > 0),
        )
        .order_by(DailyStats.date.desc())
        .limit(400)
    )
    active_dates = {r[0] for r in result.fetchall()}
    if not active_dates:
        return 0

    today = date.today()
    yesterday = today - timedelta(days=1)
    # Start counting from today or yesterday
    start = today if today in active_dates else (yesterday if yesterday in active_dates else None)
    if start is None:
        return 0

    streak = 0
    cursor = start
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


async def compute_longest_streak(user_id: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(DailyStats.date)
        .where(
            DailyStats.user_id == user_id,
            (DailyStats.focus_minutes > 0) | (DailyStats.tasks_completed > 0),
        )
        .order_by(DailyStats.date.asc())
    )
    active_dates = sorted(r[0] for r in result.fetchall())
    if not active_dates:
        return 0

    longest = current = 1
    for i in range(1, len(active_dates)):
        if (active_dates[i] - active_dates[i - 1]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest


async def get_all_time_summary(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(
            func.sum(DailyStats.focus_minutes).label("total_focus"),
            func.sum(DailyStats.pomodoros).label("total_pomodoros"),
            func.sum(DailyStats.tasks_completed).label("total_tasks"),
            func.sum(DailyStats.notes_created).label("total_notes"),
            func.max(DailyStats.date).label("last_active"),
            func.count(DailyStats.id).label("total_days"),
            func.avg(DailyStats.focus_minutes).label("avg_focus"),
            func.avg(DailyStats.productivity_score).label("avg_score"),
        ).where(DailyStats.user_id == user_id)
    )
    row = result.one()
    streak = await compute_streak(user_id, db)
    longest = await compute_longest_streak(user_id, db)

    return {
        "total_focus_minutes": int(row.total_focus or 0),
        "total_pomodoros": int(row.total_pomodoros or 0),
        "total_tasks_completed": int(row.total_tasks or 0),
        "total_notes_created": int(row.total_notes or 0),
        "streak_days": streak,
        "longest_streak": longest,
        "last_active_date": row.last_active,
        "avg_daily_focus_minutes": round(float(row.avg_focus or 0), 1),
        "avg_daily_productivity_score": round(float(row.avg_score or 0), 2),
    }


async def advance_recurring_task(task: Task, db: AsyncSession) -> Task | None:
    """Create the next occurrence of a recurring task after completion."""
    if not task.recurring:
        return None

    freq = task.recurring.get("frequency", "")
    base_date = task.due_date or datetime.utcnow()

    if freq == "daily":
        next_due = base_date + timedelta(days=1)
    elif freq == "weekly":
        next_due = base_date + timedelta(weeks=1)
    elif freq == "monthly":
        # Advance month naively: same day, next month
        month = base_date.month % 12 + 1
        year = base_date.year + (1 if base_date.month == 12 else 0)
        try:
            next_due = base_date.replace(year=year, month=month)
        except ValueError:
            # Day doesn't exist in next month (e.g. Feb 30) — use last day
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            next_due = base_date.replace(year=year, month=month, day=last_day)
    else:
        return None

    new_task = Task(
        id=str(uuid.uuid4()),
        user_id=task.user_id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=next_due,
        reminder_time=task.reminder_time,
        estimated_pomodoros=task.estimated_pomodoros,
        completed_pomodoros=0,
        tags=task.tags,
        recurring={"frequency": freq, "next_due": next_due.isoformat()},
        completed=False,
        completed_at=None,
    )
    db.add(new_task)

    # Update original task's recurring.next_due reference
    task.recurring = {**task.recurring, "next_due": next_due.isoformat()}
    await db.flush()
    return new_task

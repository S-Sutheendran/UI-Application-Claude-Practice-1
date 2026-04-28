from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from database import get_db
from models.user import User
from models.task import Task
from models.note import Note
from models.pomodoro import PomodoroSession
from models.stats import DailyStats
from schemas.user import AdminUserResponse, AdminUserStats, AdminUserPatch
from core.dependencies import require_admin
from core.exceptions import NotFoundError

router = APIRouter(prefix="/admin", tags=["admin"])

ONLINE_WINDOW_MINUTES = 15


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _build_user_stats(user_id: str, db: AsyncSession) -> AdminUserStats:
    task_r = await db.execute(
        select(func.count(Task.id), func.sum(Task.completed.cast("integer")))
        .where(Task.user_id == user_id)
    )
    task_row = task_r.one()
    total_tasks = task_row[0] or 0
    completed_tasks = int(task_row[1] or 0)

    note_r = await db.execute(select(func.count(Note.id)).where(Note.user_id == user_id))
    total_notes = note_r.scalar() or 0

    stats_r = await db.execute(
        select(
            func.coalesce(func.sum(DailyStats.focus_minutes), 0),
            func.coalesce(func.sum(DailyStats.pomodoros), 0),
            func.coalesce(func.avg(DailyStats.productivity_score), 0.0),
            func.max(DailyStats.date),
        ).where(DailyStats.user_id == user_id)
    )
    sr = stats_r.one()
    total_focus = int(sr[0] or 0)
    total_pomodoros = int(sr[1] or 0)
    avg_score = round(float(sr[2] or 0), 2)
    last_active = sr[3]

    # Simple streak count
    active_dates_r = await db.execute(
        select(DailyStats.date)
        .where(DailyStats.user_id == user_id, DailyStats.focus_minutes > 0)
        .order_by(DailyStats.date.desc())
        .limit(365)
    )
    active_set = {r[0] for r in active_dates_r.fetchall()}
    streak = 0
    cursor = date.today()
    while cursor in active_set:
        streak += 1
        cursor -= timedelta(days=1)

    return AdminUserStats(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_focus_minutes=total_focus,
        total_pomodoros=total_pomodoros,
        total_notes=total_notes,
        streak_days=streak,
        avg_productivity_score=avg_score,
        last_active_date=datetime.combine(last_active, datetime.min.time()) if last_active else None,
    )


@router.get("/overview")
async def overview(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    now = _utcnow()
    online_cutoff = now - timedelta(minutes=ONLINE_WINDOW_MINUTES)
    today = date.today()
    week_start = today - timedelta(days=7)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar() or 0
    online_users = (await db.execute(
        select(func.count(User.id)).where(User.last_seen >= online_cutoff)
    )).scalar() or 0
    new_today = (await db.execute(
        select(func.count(User.id)).where(func.date(User.created_at) == today)
    )).scalar() or 0
    new_week = (await db.execute(
        select(func.count(User.id)).where(func.date(User.created_at) >= week_start)
    )).scalar() or 0

    platform_stats = (await db.execute(
        select(
            func.coalesce(func.sum(DailyStats.focus_minutes), 0),
            func.coalesce(func.sum(DailyStats.pomodoros), 0),
            func.coalesce(func.sum(DailyStats.tasks_completed), 0),
            func.coalesce(func.sum(DailyStats.notes_created), 0),
            func.coalesce(func.avg(DailyStats.productivity_score), 0.0),
        )
    )).one()

    today_stats = (await db.execute(
        select(
            func.coalesce(func.sum(DailyStats.focus_minutes), 0),
            func.coalesce(func.sum(DailyStats.tasks_completed), 0),
            func.coalesce(func.sum(DailyStats.pomodoros), 0),
        ).where(DailyStats.date == today)
    )).one()

    # Last 30 days daily breakdown
    thirty_days_ago = today - timedelta(days=29)
    daily_r = await db.execute(
        select(
            DailyStats.date,
            func.sum(DailyStats.focus_minutes).label("focus"),
            func.sum(DailyStats.tasks_completed).label("tasks"),
            func.sum(DailyStats.pomodoros).label("pomodoros"),
            func.count(DailyStats.user_id).label("active_users"),
        )
        .where(DailyStats.date >= thirty_days_ago)
        .group_by(DailyStats.date)
        .order_by(DailyStats.date.asc())
    )
    daily_data = [
        {
            "date": str(row.date),
            "focus_minutes": int(row.focus or 0),
            "tasks": int(row.tasks or 0),
            "pomodoros": int(row.pomodoros or 0),
            "active_users": int(row.active_users or 0),
        }
        for row in daily_r.fetchall()
    ]

    # User registrations by day (last 30 days)
    reg_r = await db.execute(
        select(func.date(User.created_at).label("day"), func.count(User.id).label("cnt"))
        .where(func.date(User.created_at) >= thirty_days_ago)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at).asc())
    )
    registrations_by_day = [{"date": str(row.day), "count": row.cnt} for row in reg_r.fetchall()]

    return {
        "total_users": total_users,
        "active_users": active_users,
        "online_users": online_users,
        "new_users_today": new_today,
        "new_users_this_week": new_week,
        "total_focus_minutes": int(platform_stats[0]),
        "total_pomodoros": int(platform_stats[1]),
        "total_tasks_completed": int(platform_stats[2]),
        "total_notes_created": int(platform_stats[3]),
        "avg_productivity_score": round(float(platform_stats[4]), 2),
        "focus_minutes_today": int(today_stats[0]),
        "tasks_completed_today": int(today_stats[1]),
        "pomodoros_today": int(today_stats[2]),
        "daily_platform_data": daily_data,
        "registrations_by_day": registrations_by_day,
    }


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    if search:
        q = q.where(
            User.username.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%") |
            User.name.ilike(f"%{search}%")
        )
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if is_admin is not None:
        q = q.where(User.is_admin == is_admin)
    q = q.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    users = result.scalars().all()

    out = []
    for u in users:
        stats = await _build_user_stats(u.id, db)
        r = AdminUserResponse.model_validate(u)
        r.stats = stats
        out.append(r)
    return out


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", user_id)
    r = AdminUserResponse.model_validate(user)
    r.stats = await _build_user_stats(user_id, db)
    return r


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def patch_user(
    user_id: str,
    body: AdminUserPatch,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", user_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    r = AdminUserResponse.model_validate(user)
    r.stats = await _build_user_stats(user_id, db)
    return r


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", user_id)
    await db.delete(user)
    await db.commit()


@router.get("/users/{user_id}/tasks")
async def user_tasks(
    user_id: str,
    limit: int = Query(100, le=500),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc()).limit(limit)
    )
    tasks = result.scalars().all()
    return [
        {
            "id": t.id, "title": t.title, "priority": t.priority,
            "completed": t.completed, "due_date": str(t.due_date) if t.due_date else None,
            "project_id": t.project_id, "tags": t.tags, "created_at": str(t.created_at),
        }
        for t in tasks
    ]


@router.get("/users/{user_id}/notes")
async def user_notes(
    user_id: str,
    limit: int = Query(50, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.user_id == user_id).order_by(Note.updated_at.desc()).limit(limit)
    )
    notes = result.scalars().all()
    return [
        {
            "id": n.id, "title": n.title,
            "content_preview": (n.content or "")[:120],
            "color": n.color, "pinned": n.pinned,
            "tags": n.tags, "updated_at": str(n.updated_at),
        }
        for n in notes
    ]


@router.get("/users/{user_id}/sessions")
async def user_sessions(
    user_id: str,
    limit: int = Query(50, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PomodoroSession)
        .where(PomodoroSession.user_id == user_id)
        .order_by(PomodoroSession.completed_at.desc())
        .limit(limit)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id, "type": s.type, "duration": s.duration,
            "completed_at": str(s.completed_at), "task_id": s.task_id,
            "hour_of_day": s.hour_of_day, "day_of_week": s.day_of_week,
        }
        for s in sessions
    ]


@router.get("/users/{user_id}/stats")
async def user_stats(
    user_id: str,
    limit: int = Query(30, le=365),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DailyStats)
        .where(DailyStats.user_id == user_id)
        .order_by(DailyStats.date.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "date": str(r.date), "focus_minutes": r.focus_minutes,
            "pomodoros": r.pomodoros, "tasks_completed": r.tasks_completed,
            "notes_created": r.notes_created, "productivity_score": r.productivity_score,
        }
        for r in rows
    ]


@router.get("/activity")
async def recent_activity(
    limit: int = Query(50, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    events = []

    # Recent task completions
    task_r = await db.execute(
        select(Task, User.username, User.name)
        .join(User, Task.user_id == User.id)
        .where(Task.completed == True, Task.completed_at.isnot(None))
        .order_by(Task.completed_at.desc())
        .limit(limit // 3)
    )
    for task, username, name in task_r.fetchall():
        events.append({
            "type": "task_completed", "timestamp": str(task.completed_at),
            "user": username, "user_name": name,
            "detail": f"Completed: {task.title}", "priority": task.priority,
        })

    # Recent notes
    note_r = await db.execute(
        select(Note, User.username, User.name)
        .join(User, Note.user_id == User.id)
        .order_by(Note.created_at.desc())
        .limit(limit // 3)
    )
    for note, username, name in note_r.fetchall():
        events.append({
            "type": "note_created", "timestamp": str(note.created_at),
            "user": username, "user_name": name,
            "detail": f"Note: {note.title or 'Untitled'}", "priority": None,
        })

    # Recent registrations
    reg_r = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(limit // 3)
    )
    for user in reg_r.scalars().all():
        events.append({
            "type": "user_registered", "timestamp": str(user.created_at),
            "user": user.username, "user_name": user.name,
            "detail": "Joined FocusMind", "priority": None,
        })

    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:limit]


@router.get("/analytics")
async def platform_analytics(
    days: int = Query(30, ge=7, le=365),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)

    # Daily platform metrics
    daily_r = await db.execute(
        select(
            DailyStats.date,
            func.count(DailyStats.user_id).label("active_users"),
            func.sum(DailyStats.focus_minutes).label("focus"),
            func.sum(DailyStats.tasks_completed).label("tasks"),
            func.sum(DailyStats.pomodoros).label("pomodoros"),
            func.avg(DailyStats.productivity_score).label("avg_score"),
        )
        .where(DailyStats.date >= start)
        .group_by(DailyStats.date)
        .order_by(DailyStats.date.asc())
    )
    daily = [
        {
            "date": str(r.date),
            "active_users": r.active_users,
            "focus_minutes": int(r.focus or 0),
            "tasks_completed": int(r.tasks or 0),
            "pomodoros": int(r.pomodoros or 0),
            "avg_score": round(float(r.avg_score or 0), 2),
        }
        for r in daily_r.fetchall()
    ]

    # Top users by focus time
    top_r = await db.execute(
        select(User.id, User.username, User.name, func.sum(DailyStats.focus_minutes).label("total_focus"))
        .join(DailyStats, DailyStats.user_id == User.id)
        .where(DailyStats.date >= start)
        .group_by(User.id, User.username, User.name)
        .order_by(func.sum(DailyStats.focus_minutes).desc())
        .limit(10)
    )
    top_users = [
        {"id": r.id, "username": r.username, "name": r.name, "total_focus_minutes": int(r.total_focus or 0)}
        for r in top_r.fetchall()
    ]

    # Focus by hour of day (platform-wide)
    hour_r = await db.execute(
        select(PomodoroSession.hour_of_day, func.count(PomodoroSession.id).label("cnt"))
        .where(PomodoroSession.type == "focus")
        .group_by(PomodoroSession.hour_of_day)
        .order_by(PomodoroSession.hour_of_day.asc())
    )
    by_hour = [{"hour": r.hour_of_day, "sessions": r.cnt} for r in hour_r.fetchall()]

    # Focus by day of week
    dow_r = await db.execute(
        select(PomodoroSession.day_of_week, func.count(PomodoroSession.id).label("cnt"))
        .where(PomodoroSession.type == "focus")
        .group_by(PomodoroSession.day_of_week)
        .order_by(PomodoroSession.day_of_week.asc())
    )
    by_dow = [{"day": r.day_of_week, "sessions": r.cnt} for r in dow_r.fetchall()]

    # Task priority distribution
    pri_r = await db.execute(
        select(Task.priority, func.count(Task.id).label("cnt"))
        .group_by(Task.priority)
    )
    priority_dist = [{"priority": r.priority, "count": r.cnt} for r in pri_r.fetchall()]

    return {
        "daily": daily,
        "top_users_by_focus": top_users,
        "focus_by_hour": by_hour,
        "focus_by_day_of_week": by_dow,
        "priority_distribution": priority_dist,
    }


@router.get("/reports/users")
async def report_users(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_focus: int = 0,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """User activity report — aggregated stats per user for a date range."""
    q = (
        select(
            User.id, User.username, User.email, User.name,
            User.is_active, User.created_at, User.last_seen,
            func.coalesce(func.sum(DailyStats.focus_minutes), 0).label("focus"),
            func.coalesce(func.sum(DailyStats.tasks_completed), 0).label("tasks"),
            func.coalesce(func.sum(DailyStats.pomodoros), 0).label("pomodoros"),
            func.coalesce(func.avg(DailyStats.productivity_score), 0.0).label("avg_score"),
            func.count(DailyStats.id).label("active_days"),
        )
        .outerjoin(DailyStats, DailyStats.user_id == User.id)
    )
    if date_from:
        q = q.where(DailyStats.date >= date_from)
    if date_to:
        q = q.where(DailyStats.date <= date_to)
    q = q.group_by(User.id, User.username, User.email, User.name, User.is_active, User.created_at, User.last_seen)
    if min_focus:
        q = q.having(func.coalesce(func.sum(DailyStats.focus_minutes), 0) >= min_focus)
    q = q.order_by(func.coalesce(func.sum(DailyStats.focus_minutes), 0).desc())

    result = await db.execute(q)
    return [
        {
            "id": r.id, "username": r.username, "email": r.email, "name": r.name,
            "is_active": r.is_active, "created_at": str(r.created_at),
            "last_seen": str(r.last_seen) if r.last_seen else None,
            "total_focus_minutes": int(r.focus), "total_tasks": int(r.tasks),
            "total_pomodoros": int(r.pomodoros),
            "avg_productivity_score": round(float(r.avg_score), 2),
            "active_days": r.active_days,
        }
        for r in result.fetchall()
    ]

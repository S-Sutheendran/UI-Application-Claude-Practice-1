"""
Analytics Service — all aggregation, computation, and report assembly.
Uses raw SQLAlchemy core expressions for efficiency on large datasets.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import Optional
from math import sqrt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from models.stats import DailyStats
from models.task import Task, Subtask
from models.project import Project
from models.pomodoro import PomodoroSession
from schemas.analytics import (
    DailyDataPoint, PeriodSummary, TrendReport, FocusPatternReport,
    ProjectHealthReport, PeriodMetrics, ComparativeReport,
    StreakSegment, StreakReport, WeeklyVelocityPoint, TaskVelocityReport,
    CorrelationReport, PriorityDistributionReport, HistoricalSummary,
    FullAnalyticsReport,
)
from config import settings

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ── Helper: Pearson r without numpy ──────────────────────────────────────────

def _pearson_r(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = sqrt(sum((x - mean_x) ** 2 for x in xs))
    den_y = sqrt(sum((y - mean_y) ** 2 for y in ys))
    denom = den_x * den_y
    return round(num / denom, 4) if denom != 0 else 0.0


def _interpret_r(r: float) -> str:
    if r >= 0.7:
        return "strong positive"
    if r >= 0.4:
        return "moderate positive"
    if r >= 0.1:
        return "weak positive"
    if r > -0.1:
        return "no correlation"
    if r > -0.4:
        return "weak negative"
    if r > -0.7:
        return "moderate negative"
    return "strong negative"


def _moving_avg(values: list[float], window: int = 7) -> list[float]:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        chunk = values[start : i + 1]
        result.append(round(sum(chunk) / len(chunk), 2))
    return result


def _pct_change(new: float, old: float) -> float:
    if old == 0:
        return 100.0 if new > 0 else 0.0
    return round((new - old) / old * 100, 1)


# ── Trend report ─────────────────────────────────────────────────────────────

async def get_trend_data(
    user_id: str,
    db: AsyncSession,
    period: str = "daily",
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> TrendReport:
    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=29)  # default 30 days

    result = await db.execute(
        select(DailyStats)
        .where(
            DailyStats.user_id == user_id,
            DailyStats.date >= start,
            DailyStats.date <= end,
        )
        .order_by(DailyStats.date.asc())
    )
    rows = result.scalars().all()

    # Build a date-keyed dict so missing days get zeros
    row_map: dict[date, DailyStats] = {r.date: r for r in rows}
    data_points: list[DailyDataPoint] = []
    cur = start
    while cur <= end:
        r = row_map.get(cur)
        data_points.append(
            DailyDataPoint(
                date=cur,
                focus_minutes=r.focus_minutes if r else 0,
                pomodoros=r.pomodoros if r else 0,
                tasks_completed=r.tasks_completed if r else 0,
                notes_created=r.notes_created if r else 0,
                productivity_score=r.productivity_score if r else 0.0,
            )
        )
        cur += timedelta(days=1)

    total_focus = sum(d.focus_minutes for d in data_points)
    total_pomos = sum(d.pomodoros for d in data_points)
    total_tasks = sum(d.tasks_completed for d in data_points)
    n = len(data_points)

    summary = PeriodSummary(
        total_focus_minutes=total_focus,
        total_pomodoros=total_pomos,
        total_tasks_completed=total_tasks,
        avg_focus_minutes=round(total_focus / n, 1) if n else 0,
        avg_productivity_score=round(sum(d.productivity_score for d in data_points) / n, 2) if n else 0,
    )

    return TrendReport(
        period=period,
        start_date=start,
        end_date=end,
        data_points=data_points,
        summary=summary,
        moving_avg_focus=_moving_avg([float(d.focus_minutes) for d in data_points]),
        moving_avg_tasks=_moving_avg([float(d.tasks_completed) for d in data_points]),
    )


# ── Focus patterns ────────────────────────────────────────────────────────────

async def get_focus_patterns(user_id: str, db: AsyncSession) -> FocusPatternReport:
    result = await db.execute(
        select(
            PomodoroSession.hour_of_day,
            PomodoroSession.day_of_week,
            func.sum(PomodoroSession.duration).label("total_minutes"),
            func.count(PomodoroSession.id).label("session_count"),
        )
        .where(PomodoroSession.user_id == user_id, PomodoroSession.type == "focus")
        .group_by(PomodoroSession.hour_of_day, PomodoroSession.day_of_week)
    )
    rows = result.fetchall()

    hourly: dict[int, int] = {}   # hour → total minutes
    daily: dict[int, int] = {}    # day_of_week → total minutes
    total_sessions = 0
    total_duration = 0

    for r in rows:
        hourly[r.hour_of_day] = hourly.get(r.hour_of_day, 0) + r.total_minutes
        daily[r.day_of_week] = daily.get(r.day_of_week, 0) + r.total_minutes
        total_sessions += r.session_count
        total_duration += r.total_minutes

    # Build full distributions (fill missing hours/days with 0)
    hourly_dist = {str(h).zfill(2): hourly.get(h, 0) for h in range(24)}
    daily_dist = {DAY_NAMES[d]: daily.get(d, 0) for d in range(7)}

    best_hours = sorted(hourly, key=hourly.get, reverse=True)[:3]
    best_day_indices = sorted(daily, key=daily.get, reverse=True)[:2]
    best_days = [DAY_NAMES[d] for d in best_day_indices]
    peak_hour = best_hours[0] if best_hours else 9
    peak_day = best_days[0] if best_days else "Monday"

    return FocusPatternReport(
        best_hours=best_hours,
        best_days=best_days,
        hourly_distribution=hourly_dist,
        daily_distribution=daily_dist,
        peak_hour=peak_hour,
        peak_day=peak_day,
        avg_session_duration=round(total_duration / total_sessions, 1) if total_sessions else 0.0,
    )


# ── Project health ────────────────────────────────────────────────────────────

async def get_project_health(
    user_id: str,
    db: AsyncSession,
    project_id: Optional[str] = None,
) -> list[ProjectHealthReport]:
    q = select(Project).where(Project.user_id == user_id)
    if project_id:
        q = q.where(Project.id == project_id)
    result = await db.execute(q)
    projects = result.scalars().all()

    reports = []
    now = datetime.utcnow()

    for proj in projects:
        task_result = await db.execute(
            select(Task).where(Task.user_id == user_id, Task.project_id == proj.id)
        )
        tasks = task_result.scalars().all()

        total = len(tasks)
        completed = [t for t in tasks if t.completed]
        pending = [t for t in tasks if not t.completed]
        overdue = [t for t in pending if t.due_date and t.due_date < now]

        completion_rate = len(completed) / total if total else 0.0

        # Average days to complete
        completion_durations = [
            (t.completed_at - t.created_at).days
            for t in completed
            if t.completed_at and t.created_at
        ]
        avg_days = (
            round(sum(completion_durations) / len(completion_durations), 1)
            if completion_durations else 0.0
        )

        # Velocity: tasks completed per week since project creation
        weeks_since = max((now.date() - proj.created_at.date()).days / 7, 1)
        velocity = round(len(completed) / weeks_since, 2)

        # Health classification
        if completion_rate >= 0.8 and len(overdue) == 0:
            health = "excellent"
        elif completion_rate >= 0.5 and len(overdue) <= 2:
            health = "good"
        elif completion_rate >= 0.25 or len(overdue) <= 5:
            health = "at_risk"
        else:
            health = "critical"

        reports.append(ProjectHealthReport(
            project_id=proj.id,
            project_name=proj.name,
            project_color=proj.color,
            total_tasks=total,
            completed_tasks=len(completed),
            pending_tasks=len(pending),
            overdue_tasks=len(overdue),
            completion_rate=round(completion_rate, 4),
            avg_completion_days=avg_days,
            velocity=velocity,
            health_status=health,
        ))

    return reports


# ── Comparative report ────────────────────────────────────────────────────────

async def _period_metrics(user_id: str, db: AsyncSession, start: date, end: date) -> PeriodMetrics:
    result = await db.execute(
        select(
            func.coalesce(func.sum(DailyStats.focus_minutes), 0).label("focus"),
            func.coalesce(func.sum(DailyStats.pomodoros), 0).label("pomos"),
            func.coalesce(func.sum(DailyStats.tasks_completed), 0).label("tasks"),
            func.coalesce(func.avg(DailyStats.productivity_score), 0.0).label("avg_score"),
            func.count(DailyStats.id).label("active_days"),
        ).where(
            DailyStats.user_id == user_id,
            DailyStats.date >= start,
            DailyStats.date <= end,
        )
    )
    r = result.one()
    return PeriodMetrics(
        focus_minutes=int(r.focus),
        pomodoros=int(r.pomos),
        tasks_completed=int(r.tasks),
        avg_productivity_score=round(float(r.avg_score), 2),
        active_days=int(r.active_days),
    )


async def get_comparative_report(user_id: str, db: AsyncSession) -> ComparativeReport:
    today = date.today()
    weekday = today.weekday()  # 0=Mon
    week_start = today - timedelta(days=weekday)
    last_week_start = week_start - timedelta(weeks=1)
    last_week_end = week_start - timedelta(days=1)
    month_start = today.replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    this_week = await _period_metrics(user_id, db, week_start, today)
    last_week = await _period_metrics(user_id, db, last_week_start, last_week_end)
    this_month = await _period_metrics(user_id, db, month_start, today)
    last_month = await _period_metrics(user_id, db, last_month_start, last_month_end)

    wow = {
        "focus_minutes": _pct_change(this_week.focus_minutes, last_week.focus_minutes),
        "pomodoros": _pct_change(this_week.pomodoros, last_week.pomodoros),
        "tasks_completed": _pct_change(this_week.tasks_completed, last_week.tasks_completed),
        "avg_productivity_score": _pct_change(this_week.avg_productivity_score, last_week.avg_productivity_score),
    }
    mom = {
        "focus_minutes": _pct_change(this_month.focus_minutes, last_month.focus_minutes),
        "pomodoros": _pct_change(this_month.pomodoros, last_month.pomodoros),
        "tasks_completed": _pct_change(this_month.tasks_completed, last_month.tasks_completed),
        "avg_productivity_score": _pct_change(this_month.avg_productivity_score, last_month.avg_productivity_score),
    }

    best = max(wow, key=lambda k: wow[k])
    worst = min(wow, key=lambda k: wow[k])

    return ComparativeReport(
        this_week=this_week,
        last_week=last_week,
        this_month=this_month,
        last_month=last_month,
        week_over_week=wow,
        month_over_month=mom,
        best_metric_this_week=best,
        worst_metric_this_week=worst,
    )


# ── Streak analysis ───────────────────────────────────────────────────────────

async def get_streak_report(user_id: str, db: AsyncSession) -> StreakReport:
    result = await db.execute(
        select(DailyStats.date, DailyStats.focus_minutes, DailyStats.tasks_completed)
        .where(DailyStats.user_id == user_id)
        .order_by(DailyStats.date.asc())
    )
    rows = result.fetchall()

    active_dates = sorted(
        r.date for r in rows if r.focus_minutes > 0 or r.tasks_completed > 0
    )

    if not active_dates:
        return StreakReport(
            current_streak=0, longest_streak=0, at_risk=True,
            total_active_days=0, streak_history=[], consistency_rate=0.0,
        )

    # Build streak segments
    segments: list[StreakSegment] = []
    seg_start = active_dates[0]
    seg_end = active_dates[0]
    for i in range(1, len(active_dates)):
        if (active_dates[i] - active_dates[i - 1]).days == 1:
            seg_end = active_dates[i]
        else:
            segments.append(StreakSegment(start_date=seg_start, end_date=seg_end, length=(seg_end - seg_start).days + 1))
            seg_start = active_dates[i]
            seg_end = active_dates[i]
    segments.append(StreakSegment(start_date=seg_start, end_date=seg_end, length=(seg_end - seg_start).days + 1))

    longest = max(s.length for s in segments)
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Current streak: latest segment must end today or yesterday
    last_seg = segments[-1]
    current = last_seg.length if last_seg.end_date in (today, yesterday) else 0
    at_risk = today not in {r.date for r in rows if r.focus_minutes > 0 or r.tasks_completed > 0}

    # Consistency: active days / total days since first activity
    total_days = (today - active_dates[0]).days + 1
    consistency = round(len(active_dates) / total_days, 4) if total_days > 0 else 0.0

    return StreakReport(
        current_streak=current,
        longest_streak=longest,
        at_risk=at_risk,
        total_active_days=len(active_dates),
        streak_history=segments[-20:],   # last 20 segments
        consistency_rate=consistency,
    )


# ── Task velocity ─────────────────────────────────────────────────────────────

async def get_task_velocity(user_id: str, db: AsyncSession) -> TaskVelocityReport:
    result = await db.execute(
        select(Task.completed_at)
        .where(Task.user_id == user_id, Task.completed == True, Task.completed_at.is_not(None))
        .order_by(Task.completed_at.asc())
    )
    rows = result.fetchall()

    if not rows:
        return TaskVelocityReport(
            weekly_velocity=[], avg_velocity=0.0,
            trend="stable", trend_pct=0.0,
            best_week=None, worst_week=None,
        )

    # Group by ISO week
    week_counts: dict[str, int] = {}
    week_starts: dict[str, date] = {}
    for (completed_at,) in rows:
        d = completed_at.date() if isinstance(completed_at, datetime) else completed_at
        iso = d.isocalendar()
        key = f"{iso.year}-W{str(iso.week).zfill(2)}"
        week_counts[key] = week_counts.get(key, 0) + 1
        if key not in week_starts:
            # Monday of that ISO week
            week_starts[key] = d - timedelta(days=d.weekday())

    weekly = [
        WeeklyVelocityPoint(week_label=k, week_start=week_starts[k], tasks_completed=v)
        for k, v in sorted(week_counts.items())
    ]

    counts = [w.tasks_completed for w in weekly]
    avg = round(sum(counts) / len(counts), 2)

    # Trend: compare last 4 weeks vs prior 4 weeks
    recent = counts[-4:] if len(counts) >= 4 else counts
    prior = counts[-8:-4] if len(counts) >= 8 else []
    recent_avg = sum(recent) / len(recent) if recent else 0
    prior_avg = sum(prior) / len(prior) if prior else recent_avg
    trend_pct = _pct_change(recent_avg, prior_avg)
    trend = "increasing" if trend_pct > 10 else ("decreasing" if trend_pct < -10 else "stable")

    best = max(weekly, key=lambda w: w.tasks_completed)
    worst = min(weekly, key=lambda w: w.tasks_completed)

    return TaskVelocityReport(
        weekly_velocity=weekly[-12:],   # last 12 weeks
        avg_velocity=avg,
        trend=trend,
        trend_pct=trend_pct,
        best_week=best,
        worst_week=worst,
    )


# ── Correlation analysis ──────────────────────────────────────────────────────

async def get_correlation_report(user_id: str, db: AsyncSession) -> CorrelationReport:
    result = await db.execute(
        select(
            DailyStats.focus_minutes,
            DailyStats.pomodoros,
            DailyStats.tasks_completed,
            DailyStats.productivity_score,
        ).where(DailyStats.user_id == user_id)
        .order_by(DailyStats.date.asc())
    )
    rows = result.fetchall()

    if len(rows) < 3:
        return CorrelationReport(
            focus_vs_tasks=0.0, pomodoros_vs_tasks=0.0,
            streak_vs_score=0.0, focus_vs_score=0.0,
            interpretations={
                "focus_vs_tasks": "insufficient data",
                "pomodoros_vs_tasks": "insufficient data",
                "streak_vs_score": "insufficient data",
                "focus_vs_score": "insufficient data",
            },
        )

    focus = [float(r.focus_minutes) for r in rows]
    pomos = [float(r.pomodoros) for r in rows]
    tasks = [float(r.tasks_completed) for r in rows]
    scores = [float(r.productivity_score) for r in rows]

    # Approximate running streak values for each day
    streaks = [float(i + 1) if tasks[i] > 0 else 0.0 for i in range(len(tasks))]

    r_ft = _pearson_r(focus, tasks)
    r_pt = _pearson_r(pomos, tasks)
    r_ss = _pearson_r(streaks, scores)
    r_fs = _pearson_r(focus, scores)

    return CorrelationReport(
        focus_vs_tasks=r_ft,
        pomodoros_vs_tasks=r_pt,
        streak_vs_score=r_ss,
        focus_vs_score=r_fs,
        interpretations={
            "focus_vs_tasks": _interpret_r(r_ft),
            "pomodoros_vs_tasks": _interpret_r(r_pt),
            "streak_vs_score": _interpret_r(r_ss),
            "focus_vs_score": _interpret_r(r_fs),
        },
    )


# ── Priority distribution ─────────────────────────────────────────────────────

async def get_priority_distribution(user_id: str, db: AsyncSession) -> PriorityDistributionReport:
    result = await db.execute(
        select(Task.priority, Task.completed, func.count(Task.id).label("cnt"))
        .where(Task.user_id == user_id)
        .group_by(Task.priority, Task.completed)
    )
    rows = result.fetchall()

    all_tasks: dict[str, int] = {"high": 0, "medium": 0, "low": 0, "none": 0}
    completed_tasks: dict[str, int] = {"high": 0, "medium": 0, "low": 0, "none": 0}
    pending_tasks: dict[str, int] = {"high": 0, "medium": 0, "low": 0, "none": 0}

    for r in rows:
        p = r.priority or "none"
        if p not in all_tasks:
            all_tasks[p] = 0
            completed_tasks[p] = 0
            pending_tasks[p] = 0
        all_tasks[p] += r.cnt
        if r.completed:
            completed_tasks[p] += r.cnt
        else:
            pending_tasks[p] += r.cnt

    rates = {
        p: round(completed_tasks[p] / all_tasks[p], 4) if all_tasks[p] else 0.0
        for p in all_tasks
    }

    most_completed = max(completed_tasks, key=completed_tasks.get)
    most_pending = max(pending_tasks, key=pending_tasks.get)

    return PriorityDistributionReport(
        all_tasks=all_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        completion_rate_by_priority=rates,
        most_completed_priority=most_completed,
        most_pending_priority=most_pending,
    )


# ── 12-month historical summary ───────────────────────────────────────────────

async def get_historical_monthly(user_id: str, db: AsyncSession) -> list[HistoricalSummary]:
    today = date.today()
    start = (today.replace(day=1) - timedelta(days=365)).replace(day=1)

    result = await db.execute(
        select(DailyStats)
        .where(DailyStats.user_id == user_id, DailyStats.date >= start)
        .order_by(DailyStats.date.asc())
    )
    rows = result.scalars().all()

    # Group by YYYY-MM
    monthly: dict[str, list] = {}
    for r in rows:
        key = r.date.strftime("%Y-%m")
        monthly.setdefault(key, []).append(r)

    summaries = []
    for key in sorted(monthly):
        month_rows = monthly[key]
        active = [r for r in month_rows if r.focus_minutes > 0 or r.tasks_completed > 0]
        summaries.append(HistoricalSummary(
            month_label=key,
            focus_minutes=sum(r.focus_minutes for r in month_rows),
            pomodoros=sum(r.pomodoros for r in month_rows),
            tasks_completed=sum(r.tasks_completed for r in month_rows),
            avg_productivity_score=round(
                sum(r.productivity_score for r in active) / len(active) if active else 0.0, 2
            ),
            active_days=len(active),
        ))
    return summaries


# ── Full analytics report ─────────────────────────────────────────────────────

async def get_full_report(user_id: str, db: AsyncSession) -> FullAnalyticsReport:
    trends, patterns, projects, comparative, streak, velocity, priority, correlation, historical = (
        await get_trend_data(user_id, db),
        await get_focus_patterns(user_id, db),
        await get_project_health(user_id, db),
        await get_comparative_report(user_id, db),
        await get_streak_report(user_id, db),
        await get_task_velocity(user_id, db),
        await get_priority_distribution(user_id, db),
        await get_correlation_report(user_id, db),
        await get_historical_monthly(user_id, db),
    )
    return FullAnalyticsReport(
        generated_at=datetime.utcnow(),
        user_id=user_id,
        trends=trends,
        focus_patterns=patterns,
        project_health=projects,
        comparative=comparative,
        streak=streak,
        velocity=velocity,
        priority_distribution=priority,
        correlation=correlation,
        historical_monthly=historical,
    )

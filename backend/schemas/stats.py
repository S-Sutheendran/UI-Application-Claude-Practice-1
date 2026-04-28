from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional


class DailyStatsRecord(BaseModel):
    date: Optional[date] = None
    focus_minutes: int = 0
    pomodoros_completed: int = 0
    tasks_completed: int = 0
    notes_created: int = 0


class StatsIncrementRequest(BaseModel):
    focus_minutes: int = 0
    pomodoros_completed: int = 0
    tasks_completed: int = 0
    notes_created: int = 0


class DailyStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    date: date
    focus_minutes: int
    pomodoros: int
    tasks_completed: int
    notes_created: int
    productivity_score: float
    updated_at: datetime


class AllTimeSummary(BaseModel):
    total_focus_minutes: int
    total_pomodoros: int
    total_tasks_completed: int
    total_notes_created: int
    streak_days: int
    longest_streak: int
    last_active_date: Optional[date]
    avg_daily_focus_minutes: float
    avg_daily_productivity_score: float

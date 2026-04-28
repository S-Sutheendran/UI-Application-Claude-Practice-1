from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict, Literal


class DailyDataPoint(BaseModel):
    date: date
    focus_minutes: int
    pomodoros: int
    tasks_completed: int
    notes_created: int
    productivity_score: float


class PeriodSummary(BaseModel):
    total_focus_minutes: int
    total_pomodoros: int
    total_tasks_completed: int
    avg_focus_minutes: float
    avg_productivity_score: float


class TrendReport(BaseModel):
    period: Literal["daily", "weekly", "monthly"]
    start_date: date
    end_date: date
    data_points: List[DailyDataPoint]
    summary: PeriodSummary
    moving_avg_focus: List[float]   # 7-day moving average for focus
    moving_avg_tasks: List[float]   # 7-day moving average for tasks


class FocusPatternReport(BaseModel):
    best_hours: List[int]                   # top 3 hours by total focus minutes
    best_days: List[str]                    # top 2 days by name (e.g. "Monday")
    hourly_distribution: Dict[str, int]     # "09": total minutes, "10": total minutes ...
    daily_distribution: Dict[str, int]      # "Monday": total minutes ...
    peak_hour: int
    peak_day: str
    avg_session_duration: float


class ProjectHealthReport(BaseModel):
    project_id: str
    project_name: str
    project_color: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float              # 0.0–1.0
    avg_completion_days: float          # avg days from created_at to completed_at
    velocity: float                     # tasks completed per week
    health_status: str                  # "excellent"|"good"|"at_risk"|"critical"


class PeriodMetrics(BaseModel):
    focus_minutes: int
    pomodoros: int
    tasks_completed: int
    avg_productivity_score: float
    active_days: int


class ComparativeReport(BaseModel):
    this_week: PeriodMetrics
    last_week: PeriodMetrics
    this_month: PeriodMetrics
    last_month: PeriodMetrics
    week_over_week: Dict[str, float]    # % change per metric
    month_over_month: Dict[str, float]
    best_metric_this_week: str
    worst_metric_this_week: str


class StreakSegment(BaseModel):
    start_date: date
    end_date: date
    length: int


class StreakReport(BaseModel):
    current_streak: int
    longest_streak: int
    at_risk: bool                       # True if no activity today yet
    total_active_days: int
    streak_history: List[StreakSegment]  # chronological list of all streaks
    consistency_rate: float             # active_days / total_days_since_start


class WeeklyVelocityPoint(BaseModel):
    week_label: str             # e.g. "2025-W17"
    week_start: date
    tasks_completed: int


class TaskVelocityReport(BaseModel):
    weekly_velocity: List[WeeklyVelocityPoint]
    avg_velocity: float                 # mean tasks per week
    trend: Literal["increasing", "stable", "decreasing"]
    trend_pct: float                    # % change: last 4 weeks vs prior 4
    best_week: Optional[WeeklyVelocityPoint]
    worst_week: Optional[WeeklyVelocityPoint]


class CorrelationReport(BaseModel):
    focus_vs_tasks: float               # Pearson r
    pomodoros_vs_tasks: float
    streak_vs_score: float
    focus_vs_score: float
    interpretations: Dict[str, str]     # human-readable label per pair


class PriorityDistributionReport(BaseModel):
    all_tasks: Dict[str, int]           # {"high": 12, "medium": 34, ...}
    completed_tasks: Dict[str, int]
    pending_tasks: Dict[str, int]
    completion_rate_by_priority: Dict[str, float]
    most_completed_priority: str
    most_pending_priority: str


class HistoricalSummary(BaseModel):
    """Monthly rollup for the past 12 months."""
    month_label: str            # "2025-01"
    focus_minutes: int
    pomodoros: int
    tasks_completed: int
    avg_productivity_score: float
    active_days: int


class FullAnalyticsReport(BaseModel):
    generated_at: datetime
    user_id: str
    trends: TrendReport
    focus_patterns: FocusPatternReport
    project_health: List[ProjectHealthReport]
    comparative: ComparativeReport
    streak: StreakReport
    velocity: TaskVelocityReport
    priority_distribution: PriorityDistributionReport
    correlation: CorrelationReport
    historical_monthly: List[HistoricalSummary]   # 12-month history

from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional


class PomodoroSettingsUpdate(BaseModel):
    focus_duration: Optional[int] = None
    short_break: Optional[int] = None
    long_break: Optional[int] = None
    sessions_before_long_break: Optional[int] = None
    auto_start_breaks: Optional[bool] = None
    auto_start_pomodoros: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    selected_sound: Optional[str] = None
    volume: Optional[float] = None

    @field_validator("focus_duration")
    @classmethod
    def focus_valid(cls, v):
        if v is not None and not (1 <= v <= 90):
            raise ValueError("focus_duration must be between 1 and 90 minutes")
        return v

    @field_validator("volume")
    @classmethod
    def volume_valid(cls, v):
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("volume must be between 0.0 and 1.0")
        return v


class PomodoroSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    focus_duration: int
    short_break: int
    long_break: int
    sessions_before_long_break: int
    auto_start_breaks: bool
    auto_start_pomodoros: bool
    sound_enabled: bool
    selected_sound: str
    volume: float
    updated_at: datetime


class PomodoroSessionCreate(BaseModel):
    type: str
    duration: int
    task_id: Optional[str] = None
    completed_at: Optional[datetime] = None

    @field_validator("type")
    @classmethod
    def type_valid(cls, v):
        if v not in ("focus", "short_break", "long_break"):
            raise ValueError("type must be focus, short_break, or long_break")
        return v

    @field_validator("duration")
    @classmethod
    def duration_valid(cls, v):
        if v < 1:
            raise ValueError("duration must be at least 1 minute")
        return v


class PomodoroSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    task_id: Optional[str]
    type: str
    duration: int
    completed_at: datetime
    hour_of_day: int
    day_of_week: int


class PomodoroSessionAggregation(BaseModel):
    total_sessions: int
    total_focus_minutes: int
    average_sessions_per_day: float
    best_hour_of_day: Optional[int]
    best_day_of_week: Optional[int]

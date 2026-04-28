from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List
import re


class SubtaskCreate(BaseModel):
    title: str
    done: bool = False
    position: int = 0


class SubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    task_id: str
    title: str
    done: bool
    position: int
    created_at: datetime


class RecurringConfig(BaseModel):
    frequency: str  # daily|weekly|monthly
    next_due: Optional[str] = None  # ISO date string

    @field_validator("frequency")
    @classmethod
    def freq_valid(cls, v):
        if v not in ("daily", "weekly", "monthly"):
            raise ValueError("frequency must be daily, weekly, or monthly")
        return v


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "none"
    project_id: Optional[str] = None
    tags: List[str] = []
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    estimated_pomodoros: int = 1
    subtasks: List[SubtaskCreate] = []
    recurring: Optional[RecurringConfig] = None

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, v):
        if v not in ("high", "medium", "low", "none"):
            raise ValueError("priority must be high, medium, low, or none")
        return v

    @field_validator("reminder_time")
    @classmethod
    def reminder_valid(cls, v):
        if v is not None and not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("reminder_time must be HH:MM")
        return v

    @field_validator("tags")
    @classmethod
    def tags_dedup(cls, v):
        return list(dict.fromkeys(t.lower().strip() for t in v if t.strip()))

    @field_validator("estimated_pomodoros")
    @classmethod
    def pomos_valid(cls, v):
        if v < 1:
            raise ValueError("estimated_pomodoros must be at least 1")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    estimated_pomodoros: Optional[int] = None
    completed_pomodoros: Optional[int] = None
    completed: Optional[bool] = None
    recurring: Optional[RecurringConfig] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: Optional[str]
    title: str
    description: str
    priority: str
    due_date: Optional[datetime]
    reminder_time: Optional[str]
    estimated_pomodoros: int
    completed_pomodoros: int
    tags: list
    recurring: Optional[dict]
    completed: bool
    completed_at: Optional[datetime]
    subtasks: List[SubtaskResponse] = []
    created_at: datetime
    updated_at: datetime


class TaskToggleResponse(BaseModel):
    completed: TaskResponse
    next: Optional[TaskResponse] = None  # populated when recurring task advances

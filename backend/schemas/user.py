from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
import re


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str = "User"

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not re.match(r"^[a-zA-Z0-9_.-]+$", v):
            raise ValueError("Username may only contain letters, numbers, _, . and -")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[str] = None
    daily_goal: Optional[int] = None
    week_starts_on: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    ai_enabled: Optional[bool] = None
    anthropic_api_key: Optional[str] = None  # plaintext — encrypted before storage

    @field_validator("theme")
    @classmethod
    def theme_valid(cls, v):
        if v is not None and v not in ("dark", "light"):
            raise ValueError("theme must be 'dark' or 'light'")
        return v

    @field_validator("daily_goal")
    @classmethod
    def goal_valid(cls, v):
        if v is not None and not (1 <= v <= 20):
            raise ValueError("daily_goal must be between 1 and 20")
        return v

    @field_validator("week_starts_on")
    @classmethod
    def week_valid(cls, v):
        if v is not None and v not in ("monday", "sunday"):
            raise ValueError("week_starts_on must be 'monday' or 'sunday'")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    name: str
    theme: str
    daily_goal: int
    week_starts_on: str
    notifications_enabled: bool
    ai_enabled: bool
    phone_number: Optional[str]
    is_active: bool
    is_admin: bool
    last_seen: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class AdminUserPatch(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    daily_goal: Optional[int] = None


class AdminUserStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    total_focus_minutes: int
    total_pomodoros: int
    total_notes: int
    streak_days: int
    avg_productivity_score: float
    last_active_date: Optional[datetime]


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    name: str
    is_active: bool
    is_admin: bool
    daily_goal: int
    ai_enabled: bool
    last_seen: Optional[datetime]
    created_at: datetime
    stats: Optional[AdminUserStats] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: str

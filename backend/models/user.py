import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(128), default="User")
    theme: Mapped[str] = mapped_column(String(16), default="dark")
    daily_goal: Mapped[int] = mapped_column(Integer, default=4)
    week_starts_on: Mapped[str] = mapped_column(String(16), default="monday")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    anthropic_api_key_encrypted: Mapped[str | None] = mapped_column(String(512), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    tasks: Mapped[list] = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    projects: Mapped[list] = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    notes: Mapped[list] = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    pomodoro_sessions: Mapped[list] = relationship("PomodoroSession", back_populates="user", cascade="all, delete-orphan")
    pomodoro_settings: Mapped["PomodoroSettings | None"] = relationship("PomodoroSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chat_messages: Mapped[list] = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    daily_stats: Mapped[list] = relationship("DailyStats", back_populates="user", cascade="all, delete-orphan")

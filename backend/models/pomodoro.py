import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, Float, DateTime, ForeignKey, func, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class PomodoroSettings(Base):
    __tablename__ = "pomodoro_settings"
    __table_args__ = (UniqueConstraint("user_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    focus_duration: Mapped[int] = mapped_column(Integer, default=25)
    short_break: Mapped[int] = mapped_column(Integer, default=5)
    long_break: Mapped[int] = mapped_column(Integer, default=15)
    sessions_before_long_break: Mapped[int] = mapped_column(Integer, default=4)
    auto_start_breaks: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_start_pomodoros: Mapped[bool] = mapped_column(Boolean, default=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    selected_sound: Mapped[str] = mapped_column(String(32), default="rain")
    volume: Mapped[float] = mapped_column(Float, default=0.5)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="pomodoro_settings")


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"
    __table_args__ = (
        Index("ix_pomo_user_completed_at", "user_id", "completed_at"),
        Index("ix_pomo_user_hour", "user_id", "hour_of_day"),
        Index("ix_pomo_user_day", "user_id", "day_of_week"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # focus|short_break|long_break
    duration: Mapped[int] = mapped_column(Integer, nullable=False)  # actual minutes completed
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    hour_of_day: Mapped[int] = mapped_column(Integer, nullable=False)  # 0–23 (denormalized)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon … 6=Sun (denormalized)

    user: Mapped["User"] = relationship("User", back_populates="pomodoro_sessions")

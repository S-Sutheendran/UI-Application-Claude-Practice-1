import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey, UniqueConstraint, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class DailyStats(Base):
    __tablename__ = "daily_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_daily_stats_user_date"),
        Index("ix_daily_stats_user_date", "user_id", "date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    focus_minutes: Mapped[int] = mapped_column(Integer, default=0)
    pomodoros: Mapped[int] = mapped_column(Integer, default=0)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    notes_created: Mapped[int] = mapped_column(Integer, default=0)
    productivity_score: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="daily_stats")

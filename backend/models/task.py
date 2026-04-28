import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, Text, JSON, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_user_due", "user_id", "due_date"),
        Index("ix_tasks_user_completed", "user_id", "completed"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(16), default="none")  # high|medium|low|none
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_time: Mapped[str | None] = mapped_column(String(8), nullable=True)  # "HH:MM"
    estimated_pomodoros: Mapped[int] = mapped_column(Integer, default=1)
    completed_pomodoros: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    recurring: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {frequency, next_due}
    completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="tasks")
    project: Mapped["Project | None"] = relationship("Project", back_populates="tasks")
    subtasks: Mapped[list["Subtask"]] = relationship(
        "Subtask", back_populates="task",
        cascade="all, delete-orphan",
        order_by="Subtask.position",
    )


class Subtask(Base):
    __tablename__ = "subtasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    task: Mapped[Task] = relationship("Task", back_populates="subtasks")

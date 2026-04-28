import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class AdminOTP(Base):
    __tablename__ = "admin_otps"
    __table_args__ = (Index("ix_admin_otp_user_active", "user_id", "used"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(64), nullable=False)   # SHA-256 hex
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

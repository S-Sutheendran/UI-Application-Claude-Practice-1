from pydantic_settings import BaseSettings, SettingsConfigDict
import json
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./focusmind.db"

    # Google Drive
    GOOGLE_CREDENTIALS_JSON: str = "./credentials/google_service_account.json"
    BACKUP_DRIVE_FOLDER_ID: str = ""
    MAX_BACKUPS_PER_USER: int = 10

    # Productivity score weights
    SCORE_WEIGHT_FOCUS: float = 0.40
    SCORE_WEIGHT_POMODOROS: float = 0.30
    SCORE_WEIGHT_TASKS: float = 0.20
    SCORE_WEIGHT_STREAK: float = 0.10

    # Score denominators
    SCORE_MAX_FOCUS_MINUTES: int = 120
    SCORE_MAX_POMODOROS: int = 8
    SCORE_MAX_TASKS: int = 5
    SCORE_MAX_STREAK_DAYS: int = 7

    # Twilio SMS (leave TWILIO_ACCOUNT_SID empty to use console fallback in dev)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""   # e.g. +15005550006

    # OTP
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 3

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:8081","http://localhost:3001"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["*"]

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL

    @property
    def score_weights(self) -> dict:
        return {
            "focus": self.SCORE_WEIGHT_FOCUS,
            "pomodoros": self.SCORE_WEIGHT_POMODOROS,
            "tasks": self.SCORE_WEIGHT_TASKS,
            "streak": self.SCORE_WEIGHT_STREAK,
        }

    def compute_productivity_score(
        self,
        focus_minutes: int,
        pomodoros: int,
        tasks_completed: int,
        streak_days: int,
    ) -> float:
        w = self.score_weights
        score = (
            min(focus_minutes / self.SCORE_MAX_FOCUS_MINUTES, 1.0) * w["focus"]
            + min(pomodoros / self.SCORE_MAX_POMODOROS, 1.0) * w["pomodoros"]
            + min(tasks_completed / self.SCORE_MAX_TASKS, 1.0) * w["tasks"]
            + min(streak_days / self.SCORE_MAX_STREAK_DAYS, 1.0) * w["streak"]
        )
        return round(min(score * 100, 100.0), 2)


settings = Settings()

from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any


class BackupMetadata(BaseModel):
    version: str = "1.0"
    app_version: str = "1.0.0"
    created_at: str              # ISO datetime string
    user_id: str
    record_counts: Dict[str, int]


class BackupPayload(BaseModel):
    metadata: BackupMetadata
    users: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    subtasks: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    notes: List[Dict[str, Any]]
    pomodoro_settings: List[Dict[str, Any]]
    pomodoro_sessions: List[Dict[str, Any]]
    chat_messages: List[Dict[str, Any]]
    daily_stats: List[Dict[str, Any]]

    @field_validator("metadata")
    @classmethod
    def version_check(cls, v: BackupMetadata) -> BackupMetadata:
        major = int(v.version.split(".")[0])
        if major > 1:
            raise ValueError(f"Backup version {v.version} is too new for this app version")
        return v


class DriveBackupInfo(BaseModel):
    drive_file_id: str
    file_name: str
    size_bytes: int
    created_at: str
    user_id: str
    record_counts: Optional[Dict[str, int]] = None


class BackupResponse(BaseModel):
    backup_id: str              # same as drive_file_id
    drive_file_id: str
    drive_file_name: str
    original_size_bytes: int
    compressed_size_bytes: int
    compression_ratio: float
    created_at: datetime
    record_counts: Dict[str, int]


class RestoreRequest(BaseModel):
    drive_file_id: str
    dry_run: bool = False
    overwrite: bool = True      # if False, merge (not-yet-implemented path returns warning)


class RestoreResponse(BaseModel):
    success: bool
    dry_run: bool
    records_restored: Dict[str, int]
    validation_errors: List[str]
    warnings: List[str]
    duration_ms: Optional[float] = None

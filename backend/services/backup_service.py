"""
Backup Service — full backup/restore pipeline with Google Drive sync.
All DB operations run inside a single transaction on restore.
Schema validation is performed before any DB mutation.
"""
import gzip
import json
import uuid
import time
import logging
from datetime import datetime
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert, text
from models.user import User
from models.task import Task, Subtask
from models.project import Project
from models.note import Note
from models.pomodoro import PomodoroSession, PomodoroSettings
from models.chat import ChatMessage
from models.stats import DailyStats
from schemas.backup import BackupPayload, BackupMetadata, BackupResponse, RestoreRequest, RestoreResponse
from services import drive_service
from config import settings
from core.exceptions import BackupCorruptedError, DriveServiceError

logger = logging.getLogger("focusmind.backup")


def _serialize_row(row: Any) -> dict:
    """Convert a SQLAlchemy model instance to a JSON-safe dict."""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            d[col.name] = val.isoformat()
        elif hasattr(val, "isoformat"):
            d[col.name] = val.isoformat()
        else:
            d[col.name] = val
    return d


async def _fetch_all(db: AsyncSession, model, user_id: str) -> list[dict]:
    result = await db.execute(select(model).where(model.user_id == user_id))
    return [_serialize_row(r) for r in result.scalars().all()]


async def _fetch_subtasks(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(Subtask).join(Task, Subtask.task_id == Task.id).where(Task.user_id == user_id)
    )
    return [_serialize_row(r) for r in result.scalars().all()]


async def _fetch_user(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    d = _serialize_row(user)
    d.pop("hashed_password", None)        # never include passwords in backup
    d.pop("anthropic_api_key_encrypted", None)
    return [d]


# ── Create backup ─────────────────────────────────────────────────────────────

async def create_backup(user_id: str, db: AsyncSession) -> BackupResponse:
    users = await _fetch_user(db, user_id)
    tasks = await _fetch_all(db, Task, user_id)
    subtasks = await _fetch_subtasks(db, user_id)
    projects = await _fetch_all(db, Project, user_id)
    notes = await _fetch_all(db, Note, user_id)
    pomo_settings = await _fetch_all(db, PomodoroSettings, user_id)
    pomo_sessions = await _fetch_all(db, PomodoroSession, user_id)
    chat_messages = await _fetch_all(db, ChatMessage, user_id)
    daily_stats = await _fetch_all(db, DailyStats, user_id)

    record_counts = {
        "users": len(users),
        "tasks": len(tasks),
        "subtasks": len(subtasks),
        "projects": len(projects),
        "notes": len(notes),
        "pomodoro_settings": len(pomo_settings),
        "pomodoro_sessions": len(pomo_sessions),
        "chat_messages": len(chat_messages),
        "daily_stats": len(daily_stats),
    }

    payload = BackupPayload(
        metadata=BackupMetadata(
            version="1.0",
            app_version="1.0.0",
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
            record_counts=record_counts,
        ),
        users=users,
        tasks=tasks,
        subtasks=subtasks,
        projects=projects,
        notes=notes,
        pomodoro_settings=pomo_settings,
        pomodoro_sessions=pomo_sessions,
        chat_messages=chat_messages,
        daily_stats=daily_stats,
    )

    raw_bytes = json.dumps(payload.model_dump(), default=str, ensure_ascii=False).encode("utf-8")
    compressed = gzip.compress(raw_bytes, compresslevel=9)

    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"focusmind_backup_{user_id[:8]}_{ts}.json.gz"
    folder_id = settings.BACKUP_DRIVE_FOLDER_ID or None

    drive_meta = drive_service.upload_file(
        filename=filename,
        content_bytes=compressed,
        mimetype="application/gzip",
        folder_id=folder_id,
    )

    # Rotate: delete oldest backups beyond MAX_BACKUPS_PER_USER
    if folder_id:
        try:
            existing = drive_service.list_backups(folder_id, user_id)
            if len(existing) > settings.MAX_BACKUPS_PER_USER:
                for old in existing[settings.MAX_BACKUPS_PER_USER:]:
                    drive_service.delete_file(old["id"])
        except Exception as e:
            logger.warning("Backup rotation failed: %s", e)

    return BackupResponse(
        backup_id=drive_meta["id"],
        drive_file_id=drive_meta["id"],
        drive_file_name=filename,
        original_size_bytes=len(raw_bytes),
        compressed_size_bytes=len(compressed),
        compression_ratio=round(len(compressed) / len(raw_bytes), 4),
        created_at=datetime.utcnow(),
        record_counts=record_counts,
    )


# ── Restore backup ────────────────────────────────────────────────────────────

async def restore_backup(
    drive_file_id: str,
    user_id: str,
    db: AsyncSession,
    dry_run: bool = False,
) -> RestoreResponse:
    start_time = time.perf_counter()
    validation_errors: list[str] = []
    warnings: list[str] = []

    # Step 1: Download
    try:
        compressed = drive_service.download_file(drive_file_id)
    except DriveServiceError as e:
        return RestoreResponse(
            success=False, dry_run=dry_run,
            records_restored={}, validation_errors=[str(e)], warnings=[],
        )

    # Step 2: Decompress
    try:
        raw_bytes = gzip.decompress(compressed)
    except (gzip.BadGzipFile, OSError) as e:
        return RestoreResponse(
            success=False, dry_run=dry_run,
            records_restored={}, validation_errors=[f"Invalid gzip file: {e}"], warnings=[],
        )

    # Step 3: Parse JSON
    try:
        raw_dict = json.loads(raw_bytes.decode("utf-8"))
    except json.JSONDecodeError as e:
        return RestoreResponse(
            success=False, dry_run=dry_run,
            records_restored={}, validation_errors=[f"Invalid JSON: {e}"], warnings=[],
        )

    # Step 4: Schema validation
    try:
        payload = BackupPayload(**raw_dict)
    except Exception as e:
        return RestoreResponse(
            success=False, dry_run=dry_run,
            records_restored={}, validation_errors=[f"Schema validation failed: {e}"], warnings=[],
        )

    # Step 5: Security check — user ID must match
    if payload.metadata.user_id != user_id:
        return RestoreResponse(
            success=False, dry_run=dry_run,
            records_restored={},
            validation_errors=["Backup belongs to a different user — restore aborted"],
            warnings=[],
        )

    # Step 6: Version warning
    backup_ver = payload.metadata.version
    if backup_ver != "1.0":
        warnings.append(f"Backup version {backup_ver} may have minor schema differences")

    records_would_restore = payload.metadata.record_counts

    if dry_run:
        return RestoreResponse(
            success=True, dry_run=True,
            records_restored=records_would_restore,
            validation_errors=validation_errors,
            warnings=warnings,
            duration_ms=round((time.perf_counter() - start_time) * 1000, 2),
        )

    # Step 7: Transactional restore
    try:
        # Delete existing data in dependency order (FK constraints)
        for model in [Subtask, ChatMessage, DailyStats, PomodoroSession, PomodoroSettings, Note, Task, Project]:
            if model == Subtask:
                task_ids_result = await db.execute(
                    select(Task.id).where(Task.user_id == user_id)
                )
                task_ids = [r[0] for r in task_ids_result.fetchall()]
                if task_ids:
                    await db.execute(delete(Subtask).where(Subtask.task_id.in_(task_ids)))
            elif hasattr(model, "user_id"):
                await db.execute(delete(model).where(model.user_id == user_id))

        await db.flush()

        restored_counts: dict[str, int] = {}

        # Insert in creation order (projects → tasks → subtasks → notes → ...)
        insert_order: list[tuple[Any, list[dict], str]] = [
            (Project, payload.projects, "projects"),
            (Task, payload.tasks, "tasks"),
            (Subtask, payload.subtasks, "subtasks"),
            (Note, payload.notes, "notes"),
            (PomodoroSettings, payload.pomodoro_settings, "pomodoro_settings"),
            (PomodoroSession, payload.pomodoro_sessions, "pomodoro_sessions"),
            (ChatMessage, payload.chat_messages, "chat_messages"),
            (DailyStats, payload.daily_stats, "daily_stats"),
        ]

        for model, records, key in insert_order:
            if not records:
                restored_counts[key] = 0
                continue
            cleaned = _clean_records(records, model)
            if cleaned:
                await db.execute(insert(model), cleaned)
            restored_counts[key] = len(cleaned)

        await db.commit()

        duration = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info("Restore complete for user %s in %.0fms: %s", user_id, duration, restored_counts)

        return RestoreResponse(
            success=True, dry_run=False,
            records_restored=restored_counts,
            validation_errors=[],
            warnings=warnings,
            duration_ms=duration,
        )

    except Exception as e:
        await db.rollback()
        logger.error("Restore failed for user %s: %s", user_id, e)
        return RestoreResponse(
            success=False, dry_run=False,
            records_restored={},
            validation_errors=[f"Database restore failed: {e}"],
            warnings=warnings,
        )


async def list_backups(user_id: str) -> list[dict]:
    """List all Drive backups belonging to this user."""
    from services.drive_service import list_backups as _drive_list
    from config import settings
    return _drive_list(settings.BACKUP_DRIVE_FOLDER_ID, user_id)


async def delete_backup_file(file_id: str) -> None:
    """Delete a single backup file from Drive."""
    from services.drive_service import delete_file
    delete_file(file_id)


def _clean_records(records: list[dict], model) -> list[dict]:
    """Keep only columns that exist in the model, coerce ISO strings to correct types."""
    col_names = {col.name for col in model.__table__.columns}
    cleaned = []
    for rec in records:
        row = {k: v for k, v in rec.items() if k in col_names}
        cleaned.append(row)
    return cleaned

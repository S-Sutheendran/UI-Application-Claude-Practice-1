from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from schemas.backup import RestoreRequest, RestoreResponse
from core.dependencies import get_current_user
from core.exceptions import DriveServiceError, BackupCorruptedError
from services.backup_service import create_backup, restore_backup, list_backups, delete_backup_file

router = APIRouter(prefix="/backup", tags=["backup"])


@router.post("/create")
async def trigger_backup(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        file_id = await create_backup(user.id, db)
        return {"status": "ok", "drive_file_id": file_id}
    except DriveServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/list")
async def list_user_backups(user: User = Depends(get_current_user)):
    try:
        backups = await list_backups(user.id)
        return {"backups": backups}
    except DriveServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/restore", response_model=RestoreResponse)
async def restore_from_backup(
    body: RestoreRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await restore_backup(user.id, body.drive_file_id, db, dry_run=body.dry_run, overwrite=body.overwrite)
        return result
    except BackupCorruptedError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except DriveServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.delete("/{file_id}", status_code=204)
async def delete_backup(
    file_id: str,
    user: User = Depends(get_current_user),
):
    try:
        await delete_backup_file(file_id)
    except DriveServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

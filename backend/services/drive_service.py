"""
Google Drive Service — upload, download, list, and delete backup files.
Uses a service account. All Drive errors are wrapped as DriveServiceError.
"""
import io
import os
import json
import logging
from typing import Optional
from config import settings
from core.exceptions import DriveServiceError

logger = logging.getLogger("focusmind.drive")

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
    from googleapiclient.errors import HttpError
    _DRIVE_AVAILABLE = True
except ImportError:
    _DRIVE_AVAILABLE = False
    logger.warning("google-api-python-client not installed — Drive features disabled")


SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def _get_service():
    if not _DRIVE_AVAILABLE:
        raise DriveServiceError("Google Drive libraries not installed. Run: pip install google-api-python-client google-auth")

    creds_path = settings.GOOGLE_CREDENTIALS_JSON
    if not os.path.exists(creds_path):
        raise DriveServiceError(
            f"Google credentials file not found: {creds_path}. "
            "Create a service account in Google Cloud Console and download the JSON key."
        )
    try:
        creds = service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        return build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception as e:
        raise DriveServiceError(f"Failed to authenticate with Google Drive: {e}")


def upload_file(
    filename: str,
    content_bytes: bytes,
    mimetype: str = "application/gzip",
    folder_id: Optional[str] = None,
) -> dict:
    """Upload bytes to Drive. Returns file metadata dict with id, name, size, createdTime."""
    svc = _get_service()
    metadata = {"name": filename}
    if folder_id:
        metadata["parents"] = [folder_id]
    media = MediaIoBaseUpload(io.BytesIO(content_bytes), mimetype=mimetype, resumable=False)
    try:
        result = (
            svc.files()
            .create(body=metadata, media_body=media, fields="id,name,size,createdTime")
            .execute()
        )
        return result
    except HttpError as e:
        raise DriveServiceError(f"Drive upload failed: {e.reason} (status {e.status_code})")
    except Exception as e:
        raise DriveServiceError(f"Drive upload error: {e}")


def download_file(file_id: str) -> bytes:
    """Download a file from Drive by ID. Returns raw bytes."""
    svc = _get_service()
    try:
        request = svc.files().get_media(fileId=file_id)
        buf = io.BytesIO()
        downloader = MediaIoBaseDownload(buf, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buf.getvalue()
    except HttpError as e:
        raise DriveServiceError(f"Drive download failed: {e.reason} (status {e.status_code})")
    except Exception as e:
        raise DriveServiceError(f"Drive download error: {e}")


def list_backups(folder_id: str, user_id_prefix: str) -> list[dict]:
    """List backup files in the given Drive folder for a specific user."""
    svc = _get_service()
    query = f"'{folder_id}' in parents and name contains 'focusmind_backup_{user_id_prefix[:8]}' and trashed = false"
    try:
        result = (
            svc.files()
            .list(
                q=query,
                fields="files(id,name,size,createdTime,modifiedTime)",
                orderBy="createdTime desc",
            )
            .execute()
        )
        return result.get("files", [])
    except HttpError as e:
        raise DriveServiceError(f"Drive list failed: {e.reason}")
    except Exception as e:
        raise DriveServiceError(f"Drive list error: {e}")


def delete_file(file_id: str) -> None:
    """Permanently delete a file from Drive."""
    svc = _get_service()
    try:
        svc.files().delete(fileId=file_id).execute()
    except HttpError as e:
        if e.status_code == 404:
            return  # already gone — not an error
        raise DriveServiceError(f"Drive delete failed: {e.reason}")
    except Exception as e:
        raise DriveServiceError(f"Drive delete error: {e}")


def ensure_folder(folder_name: str, parent_folder_id: Optional[str] = None) -> str:
    """Get or create a Drive folder, return its ID."""
    svc = _get_service()
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_folder_id:
        query += f" and '{parent_folder_id}' in parents"
    try:
        result = svc.files().list(q=query, fields="files(id,name)").execute()
        files = result.get("files", [])
        if files:
            return files[0]["id"]
        # Create the folder
        metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_folder_id:
            metadata["parents"] = [parent_folder_id]
        folder = svc.files().create(body=metadata, fields="id").execute()
        return folder["id"]
    except HttpError as e:
        raise DriveServiceError(f"Drive folder error: {e.reason}")

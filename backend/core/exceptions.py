from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class FocusMindError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, detail: str = ""):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.extra_detail = detail


class NotFoundError(FocusMindError):
    def __init__(self, resource: str, resource_id: str = ""):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} not found",
            detail=resource_id,
        )


class ValidationError(FocusMindError):
    def __init__(self, message: str):
        super().__init__(status_code=422, code="VALIDATION_ERROR", message=message)


class UnauthorizedError(FocusMindError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(status_code=401, code="UNAUTHORIZED", message=message)


class ForbiddenError(FocusMindError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class DriveServiceError(FocusMindError):
    def __init__(self, message: str):
        super().__init__(status_code=502, code="DRIVE_ERROR", message=message)


class BackupCorruptedError(FocusMindError):
    def __init__(self, message: str):
        super().__init__(status_code=422, code="BACKUP_CORRUPTED", message=message)


async def focusmind_exception_handler(request: Request, exc: FocusMindError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "detail": exc.extra_detail,
            }
        },
    )

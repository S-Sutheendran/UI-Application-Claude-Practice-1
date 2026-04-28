from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from sqlalchemy import select
from database import get_db
from models.user import User
from core.security import decode_token
from core.exceptions import UnauthorizedError, ForbiddenError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token payload")
    except ValueError as e:
        raise UnauthorizedError(f"Invalid or expired token: {e}")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("User not found or inactive")

    user.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return user


async def get_current_user_id(
    token: str = Depends(oauth2_scheme),
) -> str:
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token payload")
        return user_id
    except ValueError as e:
        raise UnauthorizedError(str(e))


async def require_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await get_current_user(token, db)
    if not user.is_admin:
        raise ForbiddenError()
    return user

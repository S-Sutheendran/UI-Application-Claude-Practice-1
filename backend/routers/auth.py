from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from database import get_db
from models.user import User
from models.pomodoro import PomodoroSettings
from schemas.user import UserCreate, Token, LoginRequest, UserResponse, UserSettingsUpdate
from core.security import hash_password, verify_password, create_access_token, encrypt_api_key, decrypt_api_key
from core.dependencies import get_current_user
from core.exceptions import ValidationError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(select(User).where(
        (User.username == body.username) | (User.email == body.email)
    ))
    if existing.scalar_one_or_none():
        raise ValidationError("Username or email already registered")

    user = User(
        id=str(uuid.uuid4()),
        username=body.username,
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    # Create default Pomodoro settings
    db.add(PomodoroSettings(id=str(uuid.uuid4()), user_id=user.id))
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/settings", response_model=UserResponse)
async def update_settings(
    body: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "anthropic_api_key":
            user.anthropic_api_key_encrypted = encrypt_api_key(value) if value else None
        else:
            setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/api-key")
async def get_api_key(user: User = Depends(get_current_user)):
    """Return the decrypted API key (masked) so the client can check if one is set."""
    key = decrypt_api_key(user.anthropic_api_key_encrypted or "")
    masked = key[:8] + "..." + key[-4:] if len(key) > 12 else ("set" if key else "")
    return {"has_key": bool(key), "masked": masked}

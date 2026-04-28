from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
import re
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from core.security import create_access_token
from schemas.user import UserResponse
from services.otp_service import request_otp, verify_otp
from config import settings

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])

_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


class OTPRequest(BaseModel):
    phone_number: str   # E.164 format, e.g. +14155552671

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "").replace("-", "")
        if not _E164_RE.match(v):
            raise ValueError(
                "Phone number must be in E.164 format: +<country code><number>, "
                "e.g. +14155552671"
            )
        return v


class OTPVerify(BaseModel):
    phone_number: str
    otp: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return v.strip().replace(" ", "").replace("-", "")

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


class OTPToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/request-otp")
async def request_admin_otp(body: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Send a 6-digit OTP via SMS to the admin's registered mobile number.
    Always returns 200 — never reveals whether the number is registered.
    """
    await request_otp(body.phone_number, db)
    return {
        "message": "If that number is registered, an OTP has been sent via SMS.",
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
    }


@router.post("/verify-otp", response_model=OTPToken)
async def verify_admin_otp(body: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    Verify the 6-digit OTP. Returns a JWT on success.
    Raises 401 on invalid / expired / used OTP.
    """
    user = await verify_otp(body.phone_number, body.otp, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired OTP. Request a new code.",
        )
    token = create_access_token({"sub": user.id})
    return OTPToken(access_token=token, user=UserResponse.model_validate(user))

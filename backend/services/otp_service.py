import secrets
import hashlib
import uuid
import base64
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.otp import AdminOTP
from models.user import User
from config import settings

log = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _send_sms(to_phone: str, otp: str) -> None:
    """
    Send OTP via Twilio SMS.
    Falls back to console print when TWILIO_ACCOUNT_SID is not configured.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        log.warning("=" * 56)
        log.warning("  Twilio not configured — OTP printed to console")
        log.warning(f"  To      : {to_phone}")
        log.warning(f"  OTP     : {otp}")
        log.warning(f"  Expires : {settings.OTP_EXPIRE_MINUTES} minutes")
        log.warning("=" * 56)
        return

    import httpx  # lazy import — only needed when Twilio is configured

    credentials = base64.b64encode(
        f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()
    ).decode()

    body = (
        f"Your FocusMind Admin OTP: {otp}\n"
        f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes. Do not share this code."
    )

    url = (
        f"https://api.twilio.com/2010-04-01/Accounts"
        f"/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    )

    with httpx.Client(timeout=10) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Basic {credentials}"},
            data={
                "From": settings.TWILIO_FROM_NUMBER,
                "To": to_phone,
                "Body": body,
            },
        )
        resp.raise_for_status()


async def request_otp(phone_number: str, db: AsyncSession) -> bool:
    """
    Generate and send an OTP to the given phone number.
    Returns True regardless of whether the number is registered
    (prevents phone-number enumeration).
    """
    result = await db.execute(
        select(User).where(
            User.phone_number == phone_number,
            User.is_active == True,
            User.is_admin == True,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return True  # Silent — don't reveal non-existence

    # Invalidate any existing unused OTPs for this user
    await db.execute(
        update(AdminOTP)
        .where(AdminOTP.user_id == user.id, AdminOTP.used == False)
        .values(used=True)
    )

    otp = _generate_otp()
    record = AdminOTP(
        id=str(uuid.uuid4()),
        user_id=user.id,
        otp_hash=_hash_otp(otp),
        expires_at=_utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(record)
    await db.commit()

    try:
        _send_sms(phone_number, otp)
    except Exception as exc:
        log.error("Failed to send OTP SMS to %s: %s", phone_number, exc)

    return True


async def verify_otp(phone_number: str, otp: str, db: AsyncSession) -> User | None:
    """
    Verify the OTP for the given phone number.
    Returns the User on success, None on any failure.
    Marks the OTP as used on success or after exceeding max attempts.
    """
    result = await db.execute(
        select(User).where(
            User.phone_number == phone_number,
            User.is_active == True,
            User.is_admin == True,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return None

    now = _utcnow()
    otp_result = await db.execute(
        select(AdminOTP)
        .where(
            AdminOTP.user_id == user.id,
            AdminOTP.used == False,
            AdminOTP.expires_at > now,
        )
        .order_by(AdminOTP.created_at.desc())
        .limit(1)
    )
    record = otp_result.scalar_one_or_none()
    if not record:
        return None

    # Dev bypass: OTP "000000" always succeeds when Twilio is not configured
    if not settings.TWILIO_ACCOUNT_SID and otp == "000000":
        record.used = True
        await db.commit()
        return user

    record.attempts += 1

    if record.attempts > settings.OTP_MAX_ATTEMPTS:
        record.used = True
        await db.commit()
        return None

    if record.otp_hash != _hash_otp(otp):
        await db.commit()
        return None

    record.used = True
    await db.commit()
    return user

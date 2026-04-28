"""
One-shot setup script: migrates the SQLite schema, then creates/updates an admin user.

Run from the backend/ directory:
    python create_admin.py

In development (TWILIO_ACCOUNT_SID is empty), OTP "000000" always works —
no SMS needed. Just type 000000 in the OTP boxes.
"""
import asyncio
import uuid
import sqlite3
import os
from getpass import getpass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import engine, init_db
from models.user import User
from passlib.context import CryptContext
from config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _migrate_sqlite():
    """Add any columns that were added after the initial table creation."""
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("./", "")
    if not os.path.exists(db_path):
        return  # fresh DB — create_all will handle it

    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # Get existing columns in users table
    cur.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cur.fetchall()}

    new_cols = [
        ("phone_number",  "TEXT"),
        ("is_admin",      "INTEGER NOT NULL DEFAULT 0"),
        ("last_seen",     "DATETIME"),
    ]
    for col, typedef in new_cols:
        if col not in existing:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
            print(f"  ✓ Added column: users.{col}")

    # Create admin_otps table if missing
    cur.execute("PRAGMA table_info(admin_otps)")
    if not cur.fetchall():
        cur.execute("""
            CREATE TABLE admin_otps (
                id         TEXT NOT NULL PRIMARY KEY,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                otp_hash   TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                attempts   INTEGER NOT NULL DEFAULT 0,
                used       INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS ix_admin_otp_user_active ON admin_otps(user_id, used)")
        print("  ✓ Created table: admin_otps")

    con.commit()
    con.close()


async def run():
    print("\n── FocusMind Admin Setup ──────────────────────────")

    print("\nStep 1: Migrating database schema…")
    _migrate_sqlite()

    print("Step 2: Initialising SQLAlchemy…")
    await init_db()

    async with AsyncSession(engine) as db:
        result = await db.execute(select(User).where(User.is_admin == True))
        existing_admins = result.scalars().all()

        if existing_admins:
            print(f"\nExisting admin(s):")
            for a in existing_admins:
                phone = a.phone_number or "(no phone set)"
                print(f"  [{a.username}]  phone={phone}  active={a.is_active}")

            print("\nOptions:")
            print("  1 – Update phone number on an existing admin")
            print("  2 – Create a new admin user")
            choice = input("Choice [1/2]: ").strip()
        else:
            print("\nNo admin users found. Will create one.")
            choice = "2"

        if choice == "1":
            username = input("Enter username of admin to update: ").strip()
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if not user:
                print(f"Error: user '{username}' not found.")
                return
            phone = input("Phone number (E.164, e.g. +917904005212): ").strip()
            user.phone_number = phone
            user.is_admin = True
            user.is_active = True
            await db.commit()
            print(f"\n✓ Updated {username}: phone set to {phone}")

        else:
            username = input("Username [admin]: ").strip() or "admin"
            email = input("Email [admin@focusmind.local]: ").strip() or "admin@focusmind.local"
            name = input("Display name [Admin]: ").strip() or "Admin"
            phone = input("Phone number (E.164, e.g. +917904005212): ").strip()
            password = getpass("Password (min 8 chars): ")
            if len(password) < 8:
                print("Error: password must be at least 8 characters.")
                return

            existing = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
            if existing:
                print(f"Username '{username}' already exists — updating to admin + setting phone.")
                existing.phone_number = phone
                existing.is_admin = True
                existing.is_active = True
                await db.commit()
                print(f"\n✓ Updated '{username}'")
            else:
                user = User(
                    id=str(uuid.uuid4()),
                    username=username,
                    email=email,
                    name=name,
                    hashed_password=pwd_ctx.hash(password),
                    phone_number=phone,
                    is_admin=True,
                    is_active=True,
                )
                db.add(user)
                await db.commit()
                print(f"\n✓ Created admin user '{username}' with phone={phone}")

    dev_note = ""
    if not settings.TWILIO_ACCOUNT_SID:
        dev_note = (
            "\nDEV MODE (Twilio not configured):\n"
            "  • The real OTP prints to the backend terminal when you log in.\n"
            "  • Or use the shortcut OTP  000000  — it always works in development."
        )

    print(f"""
Done!{dev_note}

Next steps:
  1. Restart the backend:   uvicorn main:app --reload
  2. Open the admin panel:  http://localhost:3001
  3. Enter your phone number and click "Send OTP via SMS"
  4. Type the OTP from the backend terminal (or use 000000 in dev mode)
""")


if __name__ == "__main__":
    asyncio.run(run())

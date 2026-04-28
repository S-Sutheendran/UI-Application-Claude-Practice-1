from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config import settings
from database import init_db
from core.exceptions import FocusMindError, focusmind_exception_handler

from routers import auth, tasks, projects, notes, pomodoro, chat, stats, analytics, backup, admin, otp_auth


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="FocusMind API",
    version="1.0.0",
    description="Productivity backend for the FocusMind app — tasks, Pomodoro, notes, AI chat, analytics, and Google Drive backup.",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(FocusMindError, focusmind_exception_handler)

# Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(projects.router)
app.include_router(notes.router)
app.include_router(pomodoro.router)
app.include_router(chat.router)
app.include_router(stats.router)
app.include_router(analytics.router)
app.include_router(backup.router)
app.include_router(admin.router)
app.include_router(otp_auth.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "1.0.0"}

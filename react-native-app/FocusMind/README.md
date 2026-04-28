# FocusMind 🧠

> **The ultimate AI-powered productivity app** — Pomodoro timer, task manager, smart notes, AI chatbot, community channels, and deep analytics in one beautiful React Native app.

---

## Features

### ✅ Task Manager (Full GTD System)
- Create tasks with **title, description, priority** (High / Medium / Low)
- **Due dates** with overdue detection and visual alerts
- **Reminders** via local push notifications at custom times
- **Pomodoro estimates** per task (🍅 ×n)
- **Subtasks** with individual completion tracking
- **Recurring tasks** (daily / weekly / monthly)
- **Projects** — color-coded groups to organize tasks
- **Tags** — custom labels for cross-cutting concerns
- Filter by: All, Today, Upcoming, Completed, High Priority
- Search across all tasks
- Sort by priority automatically

### 🍅 Pomodoro Timer
- **Three modes:** Focus (25min) · Short Break (5min) · Long Break (15min)
- **Session dots** — visual progress toward long break
- **Customizable durations** — 1–90 min focus, 1–60 min breaks
- **Auto-start breaks/Pomodoros** toggle
- **Link to a task** — track which task each Pomodoro belongs to
- **Focus sounds** — Rain · Café · Forest · Ocean · White Noise · Campfire · Silent
- **Push notifications** for session start/end
- **Daily stats** — focus time, Pomodoro count shown live

### 🗒️ Notes (AI-Enhanced)
- **Rich text notes** with colored backgrounds
- **Pin** important notes to the top
- **Grid / List** view toggle
- **Tags** for organization
- **AI Enhance** — expand and improve your note with Claude
- **AI Summarize** — condense long notes to key points
- **Search** across note titles and content
- **Color palette** — 8 beautiful dark color themes

### 🤖 AI Chatbot & Community Channels
- **FocusMind AI** (powered by Claude Opus 4.7) — conversational productivity assistant
- **Quick prompts** — Plan my day, Set priorities, Pomodoro plan, Break down task, Boost energy
- **Task creation from chat** — AI suggests tasks; tap "Add all to Tasks" to import them
- **Persistent conversation** history (last 200 messages)
- **Discord-like channels** — #general, #focus-tips, #goals, #daily-wins
- Works **offline** with smart built-in responses (no API key needed)

### 📊 Statistics Dashboard
- **Today's summary** — focus time, Pomodoros, tasks done
- **7-day bar charts** for focus minutes, Pomodoros, and task completions
- **All-time totals** — streak, total focus hours, total Pomodoros
- **Task completion rate** with priority breakdown
- **Daily productivity score** (0–100) based on focus, Pomodoros, tasks, and streak
- **Weekly averages** — daily focus time average

### ⚙️ Settings
- Personalized name and greeting
- Daily Pomodoro goal
- Anthropic API key for Claude AI
- Notification enable/disable
- Custom tag management
- Clear all data option

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo ~51 |
| Navigation | React Navigation 6 (Bottom Tabs + Stack) |
| State | Context API + useReducer |
| Persistence | AsyncStorage |
| AI | Anthropic REST API (Claude Opus 4.7) |
| Notifications | Expo Notifications |
| Animations | React Native Animated API |
| UI | Custom dark theme + LinearGradient |
| Icons | @expo/vector-icons (Ionicons) |

---

## Project Structure

```
FocusMind/
├── App.js                          # Root — providers, loading screen
├── package.json
├── app.json                        # Expo config
├── babel.config.js
└── src/
    ├── theme/index.js              # Colors, fonts, spacing, shadows
    ├── context/AppContext.js       # Global state (tasks, notes, chat, stats)
    ├── navigation/AppNavigator.js  # Tab + Stack navigation
    ├── screens/
    │   ├── HomeScreen.js           # Dashboard — today's tasks, AI suggestions, quick start
    │   ├── TasksScreen.js          # Full task manager with modal editor
    │   ├── PomodoroScreen.js       # Timer with sounds, settings, session tracking
    │   ├── NotesScreen.js          # Notes grid/list with AI enhancement
    │   ├── ChatScreen.js           # AI chatbot + Discord-style channels
    │   ├── StatsScreen.js          # Charts, scores, completion rates
    │   └── SettingsScreen.js       # Profile, AI key, notifications, tags
    └── services/
        ├── StorageService.js       # AsyncStorage wrapper for all data
        ├── AIService.js            # Anthropic API + smart offline fallbacks
        └── NotificationService.js  # Local push notifications
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator, or the **Expo Go** app on your phone

### Install

```bash
cd react-native-app/FocusMind
npm install
```

### Run

```bash
# Start Expo dev server
npx expo start

# Then press:
# i — open iOS simulator
# a — open Android emulator
# w — open web browser
# Scan QR code with Expo Go app on your phone
```

### Enable AI Features (optional)

1. Go to **Settings** tab in the app
2. Paste your [Anthropic API key](https://console.anthropic.com) in the AI section
3. The app now uses **Claude Opus 4.7** for real AI responses

> **Without an API key**, the app uses smart built-in responses for all AI features — it still works great!

---

## Key Design Decisions

### Dark-first theme
All screens use a rich dark palette (`#0F0F1E` → `#1A1A2E` → `#16213E`) with purple/cyan accents, making long focus sessions easy on the eyes.

### Offline-first
All data is stored locally via AsyncStorage. The app is fully functional with no internet connection. AI falls back to smart pre-written responses when offline or without an API key.

### Context API vs Redux
The app uses Context + useReducer — sufficient for the data volume and avoids adding Redux boilerplate. Each state slice (tasks, notes, chat, stats) is a dedicated case in the reducer.

### AI task creation flow
When the user asks the AI to create a plan, the `AIService.createPlan()` method extracts a structured JSON task list. The chat message then displays a "Suggested Tasks" panel with an "Add all to Tasks" button that bulk-imports them into the task manager.

### Pomodoro session logging
Every completed focus session is logged with duration, type, and linked task ID. Stats are computed from this log, giving accurate historical charts without maintaining redundant counters.

---

## Backend (FastAPI)

The FocusMind backend is a production-ready Python API that handles authentication, data persistence, advanced analytics, and Google Drive backup/restore.

### Backend Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI ≥ 0.111 + Uvicorn |
| Database | SQLAlchemy 2.x async (aiosqlite / asyncpg) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| API Key encryption | Fernet (cryptography) |
| Google Drive | google-api-python-client v3 |
| Analytics | Pure-Python Pearson r, moving averages |
| Config | pydantic-settings (.env) |

### Backend Project Structure

```
backend/
├── main.py                          # FastAPI app, lifespan, CORS, GZip, routers
├── config.py                        # Settings from .env, productivity score calculator
├── database.py                      # Async engine, session factory, init_db()
├── create_admin.py                  # One-shot script: DB migrate + create admin user
├── requirements.txt
├── .env.example
│
├── models/                          # SQLAlchemy ORM models
│   ├── user.py                      # User — auth, settings, is_admin, phone_number
│   ├── otp.py                       # AdminOTP — hashed OTP, expiry, attempt counter
│   ├── project.py                   # Project — color, icon, task grouping
│   ├── task.py                      # Task + Subtask — JSON tags, recurring, subtasks
│   ├── note.py                      # Note — content, tags, pin, color
│   ├── pomodoro.py                  # PomodoroSettings + PomodoroSession (denormalized)
│   ├── chat.py                      # ChatMessage — per-channel, suggested_tasks JSON
│   └── stats.py                     # DailyStats — upsert pattern, unique (user, date)
│
├── schemas/                         # Pydantic v2 request/response schemas
│   ├── user.py                      # UserResponse, AdminUserResponse, AdminUserStats
│   ├── task.py
│   ├── project.py
│   ├── note.py
│   ├── pomodoro.py
│   ├── chat.py
│   ├── stats.py
│   ├── analytics.py                 # TrendReport, FullAnalyticsReport, etc.
│   └── backup.py                    # BackupPayload (version-validated), RestoreRequest
│
├── core/
│   ├── security.py                  # JWT, bcrypt, Fernet API key encryption
│   ├── dependencies.py              # get_current_user (updates last_seen), require_admin
│   └── exceptions.py                # FocusMindError hierarchy + exception handler
│
├── services/
│   ├── otp_service.py               # OTP generate, SHA-256 hash, SMS via Twilio REST
│   ├── productivity_service.py      # Daily stats upsert, streak calc, recurring tasks
│   ├── analytics_service.py         # Trends, focus patterns, correlations, full report
│   ├── drive_service.py             # Google Drive upload/download/list/delete
│   └── backup_service.py           # gzip backup creation, validated restore
│
└── routers/
    ├── auth.py                      # /auth — register, login, me, settings, api-key
    ├── otp_auth.py                  # /admin/auth — request-otp, verify-otp (SMS)
    ├── admin.py                     # /admin — overview, users, analytics, reports
    ├── tasks.py                     # /tasks — CRUD, subtasks, toggle, overdue
    ├── projects.py                  # /projects — CRUD with task/completed counts
    ├── notes.py                     # /notes — CRUD, pin toggle
    ├── pomodoro.py                  # /pomodoro — settings, sessions, aggregation
    ├── chat.py                      # /chat — per-channel history, post, auto-trim
    ├── stats.py                     # /stats — today, daily range, record, increment
    ├── analytics.py                 # /analytics — 11 endpoints + full report
    └── backup.py                    # /backup — create, list, restore, delete
```

### API Endpoints

#### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register user, returns JWT + user |
| POST | `/auth/login` | Login, returns JWT + user |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/settings` | Update theme, daily goal, AI settings |
| GET | `/auth/api-key` | Check if API key is set (masked) |

#### Tasks — `/tasks`
| Method | Path | Description |
|---|---|---|
| GET | `/tasks` | List tasks (filter: completed, priority, project, due dates, tag, search) |
| POST | `/tasks` | Create task (with subtasks, recurring, reminders) |
| GET | `/tasks/overdue` | All incomplete past-due tasks |
| GET | `/tasks/{id}` | Get single task |
| PUT | `/tasks/{id}` | Full update |
| PATCH | `/tasks/{id}/toggle` | Toggle complete — logs stats, advances recurring |
| DELETE | `/tasks/{id}` | Delete task |
| POST | `/tasks/{id}/subtasks` | Add subtask |
| PATCH | `/tasks/{id}/subtasks/{sid}` | Update subtask |
| DELETE | `/tasks/{id}/subtasks/{sid}` | Delete subtask |

#### Projects — `/projects`
| Method | Path | Description |
|---|---|---|
| GET | `/projects` | List with `task_count` and `completed_count` |
| POST | `/projects` | Create project |
| PUT | `/projects/{id}` | Update |
| DELETE | `/projects/{id}` | Delete (cascades tasks) |

#### Notes — `/notes`
| Method | Path | Description |
|---|---|---|
| GET | `/notes` | List (filter: pinned, tag, search, limit, offset) |
| POST | `/notes` | Create note (logs `notes_created` stat) |
| GET | `/notes/{id}` | Get single note |
| PUT | `/notes/{id}` | Update |
| PATCH | `/notes/{id}/pin` | Toggle pin |
| DELETE | `/notes/{id}` | Delete |

#### Pomodoro — `/pomodoro`
| Method | Path | Description |
|---|---|---|
| GET | `/pomodoro/settings` | Get user's Pomodoro settings |
| PUT | `/pomodoro/settings` | Update settings (duration, sound, auto-start) |
| POST | `/pomodoro/sessions` | Log a completed session (focus logs stats) |
| GET | `/pomodoro/sessions` | List sessions (filter: type, task, date range) |
| GET | `/pomodoro/sessions/aggregate` | Totals, averages, best hour/day-of-week |

#### Chat — `/chat`
| Method | Path | Description |
|---|---|---|
| GET | `/chat/{channel_id}` | Message history (paged) |
| POST | `/chat/{channel_id}` | Post message — auto-trims channel at 500 msgs |
| DELETE | `/chat/{channel_id}` | Clear channel history |

#### Stats — `/stats`
| Method | Path | Description |
|---|---|---|
| GET | `/stats/today` | Today's DailyStats (creates if missing) |
| GET | `/stats/summary` | All-time totals + streak + averages |
| GET | `/stats/daily` | Date-range query (up to 365 days) |
| POST | `/stats/record` | Upsert stats for a day |
| PATCH | `/stats/today/increment` | Increment today's stats (sync from offline) |

#### Analytics — `/analytics`
| Method | Path | Description |
|---|---|---|
| GET | `/analytics/trends` | Daily trend data with 7-day moving averages |
| GET | `/analytics/trends/weekly` | Weekly aggregates |
| GET | `/analytics/trends/monthly` | Monthly aggregates |
| GET | `/analytics/focus-patterns` | Best hours and days (heatmap data) |
| GET | `/analytics/project-health` | Completion rate, overdue count per project |
| GET | `/analytics/project-health/{id}` | Single project health |
| GET | `/analytics/velocity` | Task throughput — last 4 weeks vs prior 4 |
| GET | `/analytics/streaks` | Current streak, longest streak, active days |
| GET | `/analytics/comparative` | This week vs last week, this month vs last |
| GET | `/analytics/priority-distribution` | Task counts and completion rates by priority |
| GET | `/analytics/correlations` | Pearson r — focus vs tasks, pomodoros vs productivity |
| GET | `/analytics/historical` | Monthly summaries (all time) |
| GET | `/analytics/report` | Full analytics report (all of the above combined) |

#### Admin Auth — `/admin/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/admin/auth/request-otp` | Send 6-digit OTP via SMS to registered admin phone |
| POST | `/admin/auth/verify-otp` | Verify OTP, returns JWT on success |

> Always returns 200 on `request-otp` — never reveals whether a phone number is registered (enumeration prevention).

#### Admin — `/admin` *(requires `is_admin = true`)*
| Method | Path | Description |
|---|---|---|
| GET | `/admin/overview` | Platform KPIs: users, DAU, focus time, tasks, registrations by day |
| GET | `/admin/users` | List users (search, is_active, is_admin filter, paged) |
| GET | `/admin/users/{id}` | User profile + aggregated stats |
| PATCH | `/admin/users/{id}` | Toggle active/admin, update daily goal |
| DELETE | `/admin/users/{id}` | Delete user (cascades all data) |
| GET | `/admin/users/{id}/tasks` | User's tasks |
| GET | `/admin/users/{id}/notes` | User's notes |
| GET | `/admin/users/{id}/sessions` | User's Pomodoro sessions |
| GET | `/admin/users/{id}/stats` | User's daily stats history |
| GET | `/admin/activity` | Live event feed (task completions, notes, registrations) |
| GET | `/admin/analytics` | Platform analytics: DAU, focus by hour/DoW, top users, priority dist |
| GET | `/admin/reports/users` | User activity report with date-range + min_focus filter |

#### Backup — `/backup`
| Method | Path | Description |
|---|---|---|
| POST | `/backup/create` | Serialize → gzip → upload to Google Drive |
| GET | `/backup/list` | List user's backups on Drive |
| POST | `/backup/restore` | Download → validate → restore (supports `dry_run`) |
| DELETE | `/backup/{file_id}` | Delete a backup from Drive |

### Backend Setup

#### 1. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
SECRET_KEY=your-random-secret-key-32-chars-minimum
DATABASE_URL=sqlite+aiosqlite:///./focusmind.db

# Google Drive backup (optional — backup endpoints disabled without this)
GOOGLE_CREDENTIALS_JSON=./credentials/google_service_account.json
BACKUP_DRIVE_FOLDER_ID=your-google-drive-folder-id

# CORS (adjust for your frontends)
CORS_ORIGINS=["http://localhost:3000","http://localhost:8081","http://localhost:3001","exp://localhost:8081"]

# Twilio SMS for admin OTP (leave empty to use console fallback in dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+15005550006

# OTP settings
OTP_EXPIRE_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Productivity score weights (must sum to 1.0)
SCORE_WEIGHT_FOCUS=0.40
SCORE_WEIGHT_POMODOROS=0.30
SCORE_WEIGHT_TASKS=0.20
SCORE_WEIGHT_STREAK=0.10
```

#### 3. Create the first admin user

```bash
python create_admin.py
```

This interactive script:
- Adds any missing columns to an existing SQLite database (`phone_number`, `is_admin`, `last_seen`)
- Creates the `admin_otps` table if it doesn't exist
- Prompts for username, email, phone number (E.164 format, e.g. `+917904005212`), and password
- Sets `is_admin = true` on the account

#### 4. Start the server

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

API docs available at: `http://localhost:8000/docs`

### Google Drive Backup Setup

1. Create a **Google Cloud project** and enable the **Google Drive API**
2. Create a **Service Account** and download the JSON credentials
3. Place the credentials file at `./credentials/google_service_account.json`
4. Create a folder in Google Drive and **share it** with the service account email
5. Copy the folder ID from the Drive URL into `BACKUP_DRIVE_FOLDER_ID`

**Backup file format:** `focusmind_{user_id}_{timestamp}.json.gz` — gzip-compressed JSON with schema version validation. On restore, the payload is validated with Pydantic before any DB mutation and restored in a single transaction with FK-safe deletion order.

### Architecture Notes

**Authentication:** JWT bearer tokens (7-day expiry). Anthropic API keys are encrypted at rest using Fernet with a key derived from `SECRET_KEY` via SHA-256.

**Productivity Score:** Computed on every stats update as a weighted sum of four normalized components (focus time, Pomodoros completed, tasks done, streak days). All weights and denominators are configurable via `.env`.

**Recurring tasks:** On task completion, `advance_recurring_task()` creates the next occurrence with the updated due date. The completed task is preserved for historical stats.

**Analytics without heavy dependencies:** All statistical calculations (Pearson correlation, moving averages, trend detection) are implemented in pure Python using only `math` and `statistics` from the standard library — no numpy or pandas required.

**Upsert pattern for DailyStats:** A `UniqueConstraint("user_id", "date")` prevents duplicate rows. The `update_daily_stats()` service function does get-or-create then increments, making it safe to call concurrently from multiple routers (notes creation, task toggle, Pomodoro log).

**Chat auto-trim:** Each channel is automatically trimmed to 400 messages when it hits 500, keeping the oldest messages as historical context while preventing unbounded growth.

**Backup restore safety:** Five-layer guarantee — (1) Pydantic `BackupPayload` schema validation, (2) major version compatibility check, (3) `user_id` ownership verification, (4) `dry_run` mode for preview without DB changes, (5) single transaction with FK-ordered delete → bulk insert and rollback on any error.

---

## Admin Panel (React)

A full-featured platform management dashboard built with React + Vite, accessible at `http://localhost:3001`. Requires an admin account created via `create_admin.py`.

### Admin Panel Features

| Page | Description |
|---|---|
| **Dashboard** | Live KPI cards (users, DAU, focus time, Pomodoros, tasks), 30-day trend charts, user registrations graph — auto-refreshes every 30 s |
| **Users** | Searchable, sortable user table with online indicator, activate/deactivate toggle, admin flag toggle, delete with confirmation |
| **User Detail** | Per-user profile with 5 tabs: overview charts, task list, note list, Pomodoro sessions, daily stats history |
| **Analytics** | DAU area chart, avg productivity line, focus by hour bar, focus by day-of-week bar, top-10 leaderboard, priority distribution pie |
| **Reports** | Date-range + min-focus filter, sortable aggregated user table, one-click CSV export |
| **Activity** | Live event feed (task completions, notes created, new registrations) with type filter — auto-refreshes every 15 s |

### Admin Panel Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS 3 (dark theme) |
| Charts | Recharts 2 |
| HTTP | Axios with Bearer token interceptor |
| Date utils | date-fns |
| Auth | SMS OTP → JWT stored in `localStorage` |
| Dev server | Vite proxy → backend on port 8000 |

### Admin Panel Project Structure

```
admin-panel/
├── package.json
├── vite.config.js                   # Port 3001, proxy /api → localhost:8000
├── tailwind.config.js
├── index.html
└── src/
    ├── index.css                    # Tailwind + component classes (.card, .btn-primary, .input)
    ├── main.jsx
    ├── App.jsx                      # BrowserRouter, AuthProvider, ProtectedRoute
    │
    ├── api/
    │   ├── client.js                # Axios instance, Bearer token interceptor, 401 redirect
    │   └── admin.js                 # authApi (requestOtp, verifyOtp, me), adminApi (all endpoints)
    │
    ├── context/
    │   └── AuthContext.jsx          # requestOtp, verifyOtp, logout, user state
    │
    ├── data/
    │   └── countryCodes.js          # 180+ countries with flag emoji, ISO code, dial code
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.jsx           # Sidebar + Header wrapper
    │   │   ├── Sidebar.jsx          # Fixed nav with active link highlighting, sign-out
    │   │   └── Header.jsx           # Live clock, "Live" pulse indicator
    │   └── ui/
    │       ├── StatCard.jsx         # Gradient KPI card (6 colour variants)
    │       ├── DataTable.jsx        # Client-side sortable table
    │       ├── LoadingSpinner.jsx
    │       └── Modal.jsx            # Escape-dismissible overlay modal
    │
    └── pages/
        ├── Login.jsx                # 2-step OTP: phone + country code → 6-digit boxes
        ├── Dashboard.jsx            # KPI cards + AreaChart, BarChart, PieChart
        ├── Users.jsx                # Searchable table, patch/delete modals
        ├── UserDetail.jsx           # Profile + 5-tab detail view
        ├── Analytics.jsx            # Platform analytics charts + leaderboard
        ├── Reports.jsx              # Filtered report table + CSV export
        └── Activity.jsx             # Live event feed with type filter
```

### Admin Panel Setup & Run

#### 1. Install dependencies

```bash
cd admin-panel
npm install
```

#### 2. Start the dev server

```bash
npm run dev
```

Admin panel runs at **http://localhost:3001**

> The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`, so the backend must be running on port 8000.

#### 3. Build for production

```bash
npm run build       # outputs to admin-panel/dist/
npm run preview     # preview the production build locally
```

---

### OTP Login Flow

The admin panel uses **SMS OTP authentication** — no username/password on the login screen.

**Step 1 — Enter mobile number:**
- Select your country from the searchable dropdown (flag + dial code)
- Enter your phone number (digits only — no country code)
- The full E.164 number is shown as a preview (`+917904005212`)
- Click **Send OTP via SMS**

**Step 2 — Enter 6-digit code:**
- Type or paste the 6-digit OTP (auto-advances between boxes)
- OTP is valid for **10 minutes**, max **3 attempts**
- Use **Resend OTP** after 60-second cooldown if needed

**Development mode (no Twilio configured):**
The backend prints the OTP to the terminal. As a shortcut, OTP **`000000`** always works when `TWILIO_ACCOUNT_SID` is empty — no SMS lookup needed.

```
============================================
  Twilio not configured — OTP printed to console
  To      : +917904005212
  OTP     : 482931
  Expires : 10 minutes
============================================
```

---

### Running Everything Together

Open **three terminals**:

```bash
# Terminal 1 — Backend API
cd backend
source venv/bin/activate        # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Terminal 2 — React Native / Expo app
cd react-native-app/FocusMind
npx expo start

# Terminal 3 — Admin Panel
cd admin-panel
npm run dev
```

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Expo web | http://localhost:8081 |
| Admin Panel | http://localhost:3001 |

---

## Troubleshooting

### Backend

---

#### `ModuleNotFoundError: No module named 'pydantic_settings'` (or any other package)

**Cause:** `pip install` was interrupted before it finished — the virtual environment is partially installed.

**Fix:**
```bash
cd backend
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

---

#### `ImportError: cannot import name 'DailyStatsUpsert' from 'schemas.stats'`

**Cause:** `schemas/__init__.py` references class names that were renamed during development.

**Fix:** Open `backend/schemas/__init__.py` and change:
```python
# Wrong
from .stats import DailyStatsResponse, DailyStatsUpsert, StatsSummary
# Correct
from .stats import DailyStatsResponse, DailyStatsRecord, AllTimeSummary
```

---

#### `ImportError: cannot import name 'list_backups' from 'services.backup_service'`

**Cause:** `routers/backup.py` imports `list_backups` and `delete_backup_file` from the backup service, but those wrapper functions were missing.

**Fix:** Add the following to the bottom of `backend/services/backup_service.py` (before `_clean_records`):
```python
async def list_backups(user_id: str) -> list[dict]:
    from services.drive_service import list_backups as _drive_list
    from config import settings
    return _drive_list(settings.BACKUP_DRIVE_FOLDER_ID, user_id)

async def delete_backup_file(file_id: str) -> None:
    from services.drive_service import delete_file
    delete_file(file_id)
```

---

#### `500 Internal Server Error` on any password-related endpoint (`/auth/login`, `/auth/register`)

**Cause:** `passlib 1.7.x` is incompatible with `bcrypt 4.x`. The `bcrypt` package removed the `__about__` attribute that passlib relies on, causing a crash when any password hash/verify is attempted.

**Fix:** Replace passlib with direct `bcrypt` calls in `backend/core/security.py`:
```python
# Remove: from passlib.context import CryptContext
# Remove: pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
import bcrypt

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False
```

Alternatively, pin the bcrypt version:
```bash
pip install "bcrypt==4.0.1"
```

---

#### `500 Internal Server Error` when sending OTP — backend was running fine before

**Cause:** The SQLite database (`focusmind.db`) was created before new columns (`phone_number`, `is_admin`, `last_seen`) were added to the User model. SQLAlchemy's `create_all` only creates missing *tables* — it does not add new columns to existing tables.

**Fix (Option A — fresh DB, loses existing data):**
```bash
# Stop the backend, then:
del backend\focusmind.db
# Restart — init_db() recreates the schema correctly
uvicorn main:app --reload --port 8000
```

**Fix (Option B — preserve existing data):**
```bash
cd backend
python create_admin.py   # the script adds missing columns via ALTER TABLE before creating the admin user
```

Or run the migration manually in SQLite:
```sql
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN is_admin     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_seen    DATETIME;
CREATE TABLE IF NOT EXISTS admin_otps (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash   TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

#### `UnicodeEncodeError` when running `create_admin.py` on Windows

**Cause:** Windows cmd uses CP1252 encoding by default, which cannot render the box-drawing characters (`─`) used in the script's output.

**Fix:** Set the UTF-8 environment variable before running:
```bash
set PYTHONIOENCODING=utf-8
python create_admin.py
```

---

#### No admin user — OTP request always returns "If that number is registered…" but no OTP appears

**Cause:** No user with `is_admin = true` and the matching `phone_number` exists in the database.

**Fix:** Run the seeding script from the `backend/` directory:
```bash
cd backend
venv\Scripts\activate
python create_admin.py
```

Or seed non-interactively:
```bash
python - <<'EOF'
import asyncio, uuid, sys, bcrypt
sys.path.insert(0, '.')
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import engine, init_db
from models.user import User

async def seed():
    await init_db()
    async with AsyncSession(engine) as db:
        r = await db.execute(select(User).where(User.username == 'admin'))
        user = r.scalar_one_or_none()
        if user:
            user.phone_number = '+917904005212'
            user.is_admin = True
        else:
            user = User(
                id=str(uuid.uuid4()), username='admin',
                email='admin@focusmind.local', name='Admin',
                hashed_password=bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode(),
                phone_number='+917904005212', is_admin=True, is_active=True,
            )
            db.add(user)
        await db.commit()
        print('Done')

asyncio.run(seed())
EOF
```

---

### Admin Panel

---

#### Login shows `"Not Found"` (404) when clicking Send OTP

**Cause:** The API client was sending `{ identifier }` in the request body, but the backend schema expects `{ phone_number }`.

**Fix:** Open `admin-panel/src/api/admin.js` and ensure the field names match:
```js
export const authApi = {
  requestOtp: (phone_number) =>
    client.post('/admin/auth/request-otp', { phone_number }),
  verifyOtp: (phone_number, otp) =>
    client.post('/admin/auth/verify-otp', { phone_number, otp }),
}
```

---

#### Login shows `"Request failed with status code 500"`

**Cause:** Most commonly the backend is not running or crashed on startup.

**Fix:**
1. Check the backend terminal for error output.
2. Verify the backend is reachable: open `http://localhost:8000/health` in the browser — it should return `{"status":"ok"}`.
3. If the backend is down, restart it:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn main:app --reload --port 8000
   ```
4. If the health check fails with a Python traceback, check the sections above for the matching import error or schema mismatch.

---

#### `000000` dev OTP bypass not working

**Cause:** The bypass only works when `TWILIO_ACCOUNT_SID` is empty **and** a valid active OTP record exists for the phone number (i.e., you must click *Send OTP* first before entering `000000`).

**Fix:**
1. Click **Send OTP via SMS** first (this creates the OTP record in the DB).
2. Then type `000000` in the 6-digit boxes.
3. Confirm `TWILIO_ACCOUNT_SID` is not set in `backend/.env`.

---

#### Admin panel shows a blank page or React error after login

**Cause:** The backend API returned an unexpected shape (e.g., missing field in `UserResponse`) causing a JavaScript exception.

**Fix:**
1. Open browser DevTools → Console tab and note the exact error.
2. Open DevTools → Network tab and inspect the failing API call.
3. Confirm all fields listed in `schemas/user.py → UserResponse` exist as columns in the `users` table (see the SQLite migration fix above).

---

### Development Tips

| Tip | Details |
|---|---|
| **Dev OTP shortcut** | Enter `000000` as the OTP when `TWILIO_ACCOUNT_SID` is not set. Click *Send OTP* first to create the record. |
| **View real OTP** | Watch the backend terminal — the OTP is printed there when Twilio is not configured. |
| **API Explorer** | `http://localhost:8000/docs` — interactive Swagger UI for every endpoint. |
| **Reset the DB** | Delete `backend/focusmind.db` and restart the backend to start fresh. |
| **Check backend health** | `curl http://localhost:8000/health` or open in browser. |
| **CORS errors** | Ensure `http://localhost:3001` is in `CORS_ORIGINS` in `backend/.env`. |

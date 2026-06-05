# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Never push to repository without my explicit command, but always pull from origin.
everytime push, add meaningful message based on conversation with claude.

## Project Overview

Habit Shaper is a web-based habit tracking application with streak management.

- **Frontend:** React (TypeScript) + Vite, served via Nginx
- **Backend:** Node.js + Express (TypeScript)
- **Database:** MySQL 8.0
- **Deployment:** Docker Compose with Nginx reverse proxy

## Architecture

```
Browser → :80 (Nginx reverse proxy)
              ├── /api/*   → backend:3000 (Express API)
              └── /*       → frontend:80  (React SPA)

Backend → MySQL (habit_shaper database)
```

### Containers

| Service   | Image          | Internal Port | Purpose                         |
|-----------|----------------|---------------|---------------------------------|
| nginx     | nginx:alpine   | 80            | Reverse proxy & request routing |
| backend   | node:20-alpine | 3000          | REST API server                 |
| frontend  | nginx:alpine   | 80            | Static React SPA                |
| mysql     | mysql:8.0      | 3306          | Persistent data store           |

## Project Structure

habit-shaper/
├── docker-compose.yml              # Container orchestration
├── nginx/nginx.conf                # Reverse proxy configuration
├── db/init.sql                     # Database DDL (auto-runs on first boot)
├── backend/
│   ├── Dockerfile                  # Multi-stage Node.js build
│   ├── src/
│   │   ├── index.ts                # Express app bootstrap & graceful shutdown
│   │   ├── services/
│   │   │   └── habit-marking.service.ts  # Mark completion/relapse logic
│   │   ├── types/
│   │   │   └── habit.types.ts      # Enums & interfaces
│   │   ├── utils/
│   │   │   └── timezone.utils.ts   # Timezone-aware date helpers
│   │   ├── config/
│   │   │   └── db.ts               # mysql2 connection pool
│   │   └── migrations/            # SQL migration files
│   └── package.json
frontend/
│   ├── Dockerfile                  # Multi-stage React build
│   ├── nginx.conf                  # SPA fallback for client-side routing
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                # React entry point
│       ├── App.tsx                 # Root component with tab routing
│       ├── index.css               # Tailwind directives only
│       ├── api/
│       │   └── client.ts           # Fetch wrapper with JWT auth
│       ├── context/
│       │   └── AuthContext.tsx      # Auth state provider
│       ├── pages/
│       │   ├── LoginPage.tsx        # Email + password login
│       │   ├── HabitsTab.tsx        # Tab 1: All habits table
│       │   ├── GoalsTab.tsx         # Tab 2: Goals with collapsible habit tables
│       │   └── WeeklyStreakTab.tsx   # Tab 3: Weekly streak grid
│       ├── components/
│       │   ├── TabBar.tsx           # 3-tab navigation (Habits | Goals | Weekly Streak)
│       │   ├── HabitTable.tsx       # Reusable habit table (used in Tab 1 & Tab 2)
│       │   ├── AddHabitModal.tsx     # Modal: create new habit
│       │   ├── AddGoalModal.tsx      # Modal: create new goal
│       │   ├── LinkHabitModal.tsx    # Modal: link existing habit to a goal
│       │   └── WeekPicker.tsx       # Date filter for weekly view
│       └── types/
│           └── index.ts             # Shared frontend typeslocalhost:3000 in dev
│   └── src/
│       ├── main.tsx                # React entry point
│       └── App.tsx                 # Root component (scaffold — UI to be built)
└── README.md                       # Quick-start and environment docs

## Frontend Specification
Tech Stack & Principles
React 18 + TypeScript (Vite bundler)
Tailwind CSS — the ONLY styling solution. No CSS modules, no styled-components, no other CSS frameworks.
Zero UI library — no Material UI, Ant Design, Shadcn, etc. All components are hand-built with Tailwind utility classes.
Keep it as light as possible — minimal dependencies, no state management library (use React Context + useState/useReducer).
All HTTP calls go through a single api/client.ts wrapper that attaches the JWT Authorization header.

## COLOR PALETE
Use these as main pallete color:
Deep teal — resolve
#1B3A4B
The anchor. Calm discipline, showing up daily.
Terracotta — grit
#C75B39
Earthy warmth. Effort, friction, pushing through.
Sage green — growth
#5E8C61
Slow, compounding progress. New habits taking root.
Amber gold — reward
#E0A526
Streaks, wins, the payoff worth working toward.
Charcoal — the old self
#2E2E38
Bad habits being left behind. Contrast, not the focus.
Warm cream — clean slate
#F2EAD8
Background. Fresh starts, breathing room, calm.

## MAIN LAYOUT

┌──────────────────────────────────────────────────────────┐
│  🏋️ Habit Shaper                        [User ▼] [Logout] │
├──────────────────────────────────────────────────────────┤
│  [ Habits ]  [ Goals ]  [ Weekly Streak ]                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  (Tab content renders here)                              │
│                                                          │
└──────────────────────────────────────────────────────────┘

Top bar: App name on the left, user email and logout button on the right.
Tab bar: 3 tabs — Habits, Goals, Weekly Streak. Active tab is highlighted. Tabs switch content without page navigation (React state, not router)

## TAB 1: HABITS
┌──────────────────────────────────────────────────────────┐
│  Habits                                    [+ Add Habit] │
├────┬────────────────┬───────────┬─────────┬────────┬─────┤
│ #  │ Habit Name     │ Type      │ Current │Longest │ Act │
│    │                │           │ Streak  │Streak  │     │
├────┼────────────────┼───────────┼─────────┼────────┼─────┤
│ 1  │ Exercise       │ 🟢 BUILD  │ 5 days  │ 12     │ [COMPLETE] │
│ 2  │ No Smoking     │ 🔴 BREAK  │ 23 days │ 30     │ [RELAPSED] │
│ 3  │ Read 30 min    │ 🟢 BUILD  │ 0 days  │ 7      │ [COMPLETE] │
└────┴────────────────┴───────────┴─────────┴────────┴─────┘
Column	Description
Row number (1-indexed)
Habit Name	Title of the habit
Type	BUILDING (green badge) or BREAKING (red badge)
Current Streak	Days count from lazy evaluation
Longest Streak	All-time best streak
Actions	BUILDING → "Complete" button (green). BREAKING → "Relapse" button (red).
Behavior:

[+ Add Habit] button (top-right): Opens AddHabitModal — fields: name, description (optional), type (BUILDING/BREAKING).
Complete button: POST /api/habits/:id/complete — marks today as COMPLETED. Disable after success (already marked).
Relapse button: POST /api/habits/:id/relapse — shows confirmation dialog first ("Are you sure? This resets your streak."), then submits. Button remains enabled (user could relapse again after midnight).


## TAB 2: GOALS
┌──────────────────────────────────────────────────────────┐
│  Goals         [+ Link Habit]              [+ Add Goal]  │
├──────────────────────────────────────────────────────────┤
│  ▼ Goal: "Get Fit by December"                           │
│  ┌────┬────────────────┬──────────┬─────────┬────────┬───┤
│  │ #  │ Habit Name     │ Type     │ Current │Longest │Act│
│  ├────┼────────────────┼──────────┼─────────┼────────┼───┤
│  │ 1  │ Exercise       │ 🟢 BUILD │ 5 days  │ 12     │[COMPLETE]│
│  │ 2  │ No Junk Food   │ 🔴 BREAK │ 10 days │ 15     │[RELAPSE]│
│  └────┴────────────────┴──────────┴─────────┴────────┴───┘
│                                     │
├──────────────────────────────────────────────────────────┤
│  ▶️ Goal: "Read 20 Books This Year"                      │
│  (collapsed — click to expand)                           │
└──────────────────────────────────────────────────────────┘
Structure:

Each goal is a collapsible dropdown (accordion). Click to expand/collapse.
When expanded, shows the same habit table format as Tab 1, but filtered to only habits linked to that goal. Reuse the HabitTable component.
[+ Link Habit] button at the bottom of each expanded goal: Opens LinkHabitModal — a dropdown/select of all user habits not yet linked to this goal. Calls POST /api/goals/:goalId/habits with { habitId }.
[+ Add Goal] button (top-right): Opens AddGoalModal — fields: title, description (optional), target date (optional).

## TAB 3 : WEEKLY STREAK
┌──────────────────────────────────────────────────────────┐
│  Weekly Streak                                           │
│  ┌──────────────────────────────────┐                    │
│  │ ◄  Jun 2 – Jun 8, 2026       ►  │                    │
│  └──────────────────────────────────┘                    │
├──────────────────┬─────┬─────┬─────┬─────┬─────┬────┬───┤
│ Habit            │ Mon │ Tue │ Wed │ Thu │ Fri │Sat │Sun│
├──────────────────┼─────┼─────┼─────┼─────┼─────┼────┼───┤
│ Exercise         │  ✅  │  ✅  │  ✅  │  ❌  │  ✅  │ ✅  │ — │
│ No Smoking       │  ✅  │  ✅  │  ✅  │  ✅  │  ✅  │ ✅  │ — │
│ Read 30 min      │  ✅  │  ❌  │  ✅  │  ✅  │  ❌  │ ✅  │ — │
└──────────────────┴─────┴─────┴─────┴─────┴─────┴────┴───┘
Behavior:

Week picker (top-left): Shows the current week range (Mon–Sun). ◄ and ► arrows navigate to previous/next week.
Table: Rows = all user habits. Columns = Mon through Sun of the selected week.
Cell values:
✅ (green check) — BUILDING: a COMPLETED log exists for that date. BREAKING: no RELAPSED log exists (clean day).
❌ (red cross) — BUILDING: no COMPLETED log for that date (missed). BREAKING: a RELAPSED log exists.
— (gray dash) — Date is in the future (not yet evaluable) or before the habit was created.
API call: GET /api/habits/weekly?startDate=2026-06-02&endDate=2026-06-08 — returns all habits with their logs for the range. Frontend maps sparse log data to the full 7-day grid.

Modals
All modals use a simple overlay pattern: semi-transparent black backdrop + centered white card. Close on backdrop click or ✕ button.

Modal	Fields	API Call
AddHabitModal	Name (required), Description, Type (BUILD/BREAK)	POST /api/habits
AddGoalModal	Title (required), Description, Target Date	POST /api/goals
LinkHabitModal	Dropdown of unlinked habits (select one)	POST /api/goals/:id/habits
Login Page
Simple centered card: email input, password input, "Sign In" button. No registration page initially — use API to seed users or add a "Sign Up" link later.

POST /api/auth/login → returns { token, user } → store token in localStorage.
On app load, check localStorage for token. If present, validate with GET /api/auth/me. If invalid, redirect to login.
Frontend Code Conventions
No CSS files except index.css which contains only the 3 Tailwind directives (@tailwind base/components/utilities).
All styling via Tailwind classes directly in JSX. Use className="..." only.
Color palette: Stick to Tailwind defaults — green-500/600 for building/success, red-500/600 for breaking/relapse, gray-* for neutral, blue-500 for primary actions.
Responsive: Mobile-first. Tables scroll horizontally on small screens (overflow-x-auto).
Loading states: Simple spinner or "Loading..." text. No skeleton screens.
Error states: Red text below the relevant component. Toast notifications are unnecessary.
No router library — use React state to switch between tabs (useState<'habits' | 'goals' | 'weekly'>).
Fetch, not Axios — use native fetch in api/client.ts.
API Design Conventions
All API routes are prefixed with /api/
Authentication via JWT Bearer tokens in Authorization header
Request/response bodies are JSON
Error responses follow: { "success": false, "message": "..." }
Success responses follow: { "success": true, "data": {...} }

## Commands

```bash
# Start all services
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f backend

# Reset database (destroys data)
docker compose down -v

# Access MySQL CLI
docker compose exec mysql mysql -u habit_user -phabit_password habit_shaper
```

### Local development (without Docker)

```bash
# Backend — ts-node-dev with hot reload on :3000
cd backend && npm run dev

# Frontend — Vite dev server on :5173, /api proxied to localhost:3000
cd frontend && npm run dev
```

> `frontend/tsconfig.json` sets `"noEmit": true` — Vite handles transpilation; `tsc` is for type-checking only. Run `npm run build` (which runs `tsc && vite build`) to produce the `dist/` output that the Dockerfile copies into Nginx.

## SECURITY
**   Passwordshashedwithbcrypt(costfactor12)•
   JWTsecretstoredinenvironmentvariable,nevercommittedtosource•
   Inputvalidationviaexpress-validatororzodonallendpoints•
   Ratelimitingonauthendpoints(e.g.,5attemptsperminuteperIP)•
   CORSconfiguredtoallowonlythefrontendorigin•
   SQLinjectionpreventionviaparameterizedqueries(ORM)•
   XSSpreventionviaReact'sdefaultescaping+Content-Security-Policyheaders**
## Core Domain Concepts

### Habit Types

1. **BUILDING** — Habits the user wants to establish (e.g., "Exercise daily")
   - User marks **COMPLETED** each day
   - Streak = consecutive days of COMPLETED logs counting backward from yesterday

2. **BREAKING** — Habits the user wants to stop (e.g., "No smoking")
   - Streak grows automatically every day the user stays clean
   - User marks **RELAPSED** when they fail, which resets the streak
   - `streak_start_date` on the habits table stores the day after the last relapse

### Streak Calculation: Lazy Evaluation

**There is no cron job.** Streaks are computed on-the-fly at read time:

- **Building habits:** Query `habit_logs` for consecutive COMPLETED entries backward from yesterday. Count = current streak.
- **Breaking habits:** `current_date - streak_start_date` = current streak (in days). A relapse sets `streak_start_date = tomorrow`.

### Implicit Data (Never Stored)

- **MISSED** — Derived from the absence of a COMPLETED log for a building habit on a given date.
- **CLEAN** — Derived from the absence of a RELAPSED log for a breaking habit on a given date.

Only explicit user actions (COMPLETED, RELAPSED) are persisted in `habit_logs`.

## Timezone Strategy

- Each user has a **home timezone** stored in `users.timezone` (IANA format, e.g., `Asia/Jakarta`).
- The backend computes the local date using `Intl.DateTimeFormat` and stores it as a plain `DATE` in `habit_logs.logged_date`.
- Timezone is stored per-user only — not per-log or per-habit — preventing travel-induced streak corruption.

## Database Schema

Tables: `users`, `habits`, `habit_logs`, `goals`, `goal_habits`

Key relationships:
- `users` 1:N `habits` (via `user_id`)
- `habits` 1:N `habit_logs` (via `habit_id`)
- `users` 1:N `goals` (via `user_id`)
- `goals` M:N `habits` (via `goal_habits` junction table)

Important constraints:
- `habit_logs` has a unique index on `(habit_id, logged_date)` — one log per habit per day
- `goal_habits` has a unique index on `(goal_id, habit_id)` — no duplicate links
- All foreign keys cascade on delete from `users`

Schema is auto-initialized via `db/init.sql` mounted into MySQL's `docker-entrypoint-initdb.d/`.

## Environment Variables (Backend)

| Variable        | Default                   | Description                          |
|-----------------|---------------------------|--------------------------------------|
| NODE_ENV        | `production`              | Node environment                     |
| PORT            | `3000`                    | HTTP server port                     |
| DB_HOST         | `mysql`                   | MySQL hostname (Docker service name) |
| DB_PORT         | `3306`                    | MySQL port                           |
| DB_USER         | `habit_user`              | MySQL username                       |
| DB_PASSWORD     | `habit_password`          | MySQL password                       |
| DB_NAME         | `habit_shaper`            | MySQL database name                  |
| JWT_SECRET      | `change-me-in-production` | Secret for signing JWT tokens        |
| JWT_EXPIRES_IN  | `7d`                      | JWT expiration duration              |

## API Design Conventions

- All routes prefixed with `/api/`
- Authentication via JWT Bearer tokens in `Authorization` header
- Error responses: `{ "success": false, "message": "..." }`
- Success responses: `{ "success": true, "data": {...} }`

## Code Style & Conventions

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20 (Alpine)
- **DB Driver:** `mysql2/promise` (connection pooling); no ORM — direct SQL for full query control
- **Auth:** `bcrypt` for password hashing, `jsonwebtoken` for JWT
- **Date handling:** `Intl.DateTimeFormat` for timezone conversions (no moment/dayjs)
- **Naming:** camelCase for variables/functions, PascalCase for classes/interfaces, UPPER_SNAKE for enums
- **File naming:** kebab-case (e.g., `habit-marking.service.ts`)
- **Services:** Class-based, injected with the MySQL pool via constructor

## Key Design Decisions

1. **No ORM** — Direct SQL via `mysql2/promise` for full query control.
2. **No cron/scheduler** — Lazy evaluation eliminates background job complexity and timezone batch processing.
3. **Minimal storage** — Only explicit user actions are stored; derived states (MISSED, CLEAN) are never written.
4. **Home timezone immutability** — Streaks always evaluate against the registered home timezone.
5. **One log per habit per day** — Enforced via unique index; `ON DUPLICATE KEY UPDATE` handles re-marks.

## Testing Guidance

- Unit test streak calculation logic in isolation (pure functions in `timezone.utils.ts`)
- Integration test `HabitMarkingService` with a real MySQL instance (use Docker)
- E2E test the full flow: register → create habit → mark → verify streak
- Edge cases to cover:
  - Marking at 23:59 vs 00:01 in user's timezone
  - User who hasn't logged in for 5 days (building streak should be 0)
  - Relapse on a breaking habit resets `streak_start_date` correctly
  - Goal linked to multiple habits; habit deletion cascades properly

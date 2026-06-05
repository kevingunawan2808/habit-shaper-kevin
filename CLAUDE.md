# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Habit Shaper is a web-based habit tracking application with streak management.

- **Frontend:** React (TypeScript), served via Nginx
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
│   │   ├── config/                 # (placeholder for DB/env config)
│   │   └── migrations/            # SQL migration files
│   └── package.json               # (to be created)
├── frontend/
│   ├── Dockerfile                  # Multi-stage React build
│   ├── nginx.conf                  # SPA fallback for client-side routing
│   └── src/                       # (React app source - to be created)
└── README.md                       # Quick-start and environment docs


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

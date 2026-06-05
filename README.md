# Habit Shaper

A web-based habit tracking app with streak management. Build positive habits and break negative ones through daily tracking.

## Tech Stack

- **Frontend:** React + TypeScript (Vite), served via Nginx
- **Backend:** Node.js + Express + TypeScript
- **Database:** MySQL 8.0
- **Deployment:** Docker Compose with Nginx reverse proxy

## Quick Start

**Prerequisites:** Docker Desktop must be running.

```bash
# Clone the repo
git clone git@github.com:kevingunawan2808/habit-shaper-kevin.git
cd habit-shaper-kevin

# Start all services (builds images on first run)
docker compose up -d --build
```

Open **http://localhost** in your browser.

The database is initialized automatically from `db/init.sql` on first boot.

## Architecture

```
Browser → :80 (Nginx)
              ├── /api/*  → backend:3000 (Express)
              └── /*      → frontend:80  (React SPA)

Backend → MySQL 8.0
```

## API

All routes are prefixed with `/api/`. Authenticated routes require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register `{ email, password, timezone }` |
| POST | `/api/auth/login` | Login `{ email, password }` |

### Habits

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/habits` | List all habits with current streak |
| POST | `/api/habits` | Create habit `{ name, type: "BUILDING"\|"BREAKING" }` |
| PATCH | `/api/habits/:id/mark` | Mark habit `{ status: "COMPLETED"\|"RELAPSED" }` |
| DELETE | `/api/habits/:id/mark` | Remove today's mark |
| DELETE | `/api/habits/:id` | Delete habit |

### Goals

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/goals` | List all goals with linked habits |
| POST | `/api/goals` | Create goal `{ name, description? }` |
| POST | `/api/goals/:goalId/habits/:habitId` | Link habit to goal |
| DELETE | `/api/goals/:goalId/habits/:habitId` | Unlink habit from goal |
| DELETE | `/api/goals/:id` | Delete goal |

### Responses

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "..." }
```

## Habit Types & Streaks

**BUILDING** — habits you want to establish (e.g. "Exercise daily")
- Mark `COMPLETED` each day
- Streak = consecutive completed days counting back from yesterday

**BREAKING** — habits you want to stop (e.g. "No smoking")
- Streak grows passively every clean day
- Mark `RELAPSED` when you slip — resets the streak
- Streaks are computed on read; no background jobs

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `DB_PASSWORD` | `habit_password` | MySQL password |

Override these in `docker-compose.yml` for production.

## Development

```bash
# View logs
docker compose logs -f backend

# Rebuild after code changes
docker compose up -d --build

# Reset database (destroys all data)
docker compose down -v

# MySQL CLI
docker compose exec mysql mysql -u habit_user -phabit_password habit_shaper
```

### Local backend (without Docker)

```bash
cd backend
npm install
npm run dev   # ts-node-dev with hot reload on :3000
```

### Local frontend (without Docker)

```bash
cd frontend
npm install
npm run dev   # Vite dev server on :5173, proxies /api to :3000
```

# Sprint — Project Management Workspace

Sprint is a modern, developer-focused project management workspace for software teams: organize projects, manage issues, track workflow on a Kanban board, and monitor progress from a single dashboard.

**Stack:** React + Vite + TypeScript frontend · FastAPI backend · PostgreSQL database · Docker Compose orchestration.

---

## Problem

Software teams scatter their work across spreadsheets, chat threads, and disconnected trackers. Sprint centralizes projects, issues, workflow, and activity into one workspace so progress, ownership, and priorities stay visible.

## Features

- **Overview** — a "what needs doing" dashboard: clickable stat tiles (open, in progress, overdue, done), a *Needs attention* list (overdue and urgent issues, editable in place), status breakdown, project progress rings, and a live activity feed. Scope it to one project with the project picker.
- **Issues and Board as workspace views** — one set of filters (search, status, priority, assignee, *Mine / Unassigned*, overdue, sort) lives in the URL, so reloads, Back and shared links keep the view. A *List | Board* switch carries the filters across.
- **One-step edits** — status, priority, assignee, due date and labels are inline pickers (table, board cards, drawer). Edits are optimistic and roll back on failure; edits and deletes show an **Undo** toast. Multi-select with a floating bulk-action bar.
- **Kanban board** — six columns with drag-and-drop (mouse, touch long-press, or keyboard: Space to pick up, arrows to move), persistent order inside a column, per-column "Show more", quick-add (type a title, Enter, repeat) and a *Move to* menu.
- **Issue drawer** — deep-linkable (`?issue=<id>`), auto-saving title/description with a "Saved" indicator, comments, and a full activity history (rename, assign, due date, labels, status, priority).
- **Keyboard first** — `⌘K` command palette (issues, projects, pages, actions), `C` new issue, `G` then `O/I/B` to navigate, `J/K` `X` `S/P/A/D` `⌫` in the list, `?` for the full list.
- **Project management** — create, edit, archive and delete projects with per-workspace unique identifiers (`WEB`, `API`, `DASH`).
- **Apple-style design system** — Light / Dark / Auto themes, seven accent colors, system semantic colors, 4 px spacing grid, SF-style type scale, translucent sidebar (collapsible to a rail with `⌘\`), bottom tab bar on phones. Every color pair is checked for WCAG AA with `node frontend/scripts/contrast-audit.mjs`.
- **Resilient by default** — skeletons, empty and error states, offline banner, error boundary, 404 page, reduced-motion support.

## Architecture

```text
                    USER
                      |
                      v
                WEB BROWSER
                      |  HTTP
                      v
          +------------------------+
          |   FRONTEND CONTAINER   |
          |   React + Nginx        |
          |   Port 3000            |
          +------------------------+
                      |  /api/*  (sprint-network)
                      v
          +------------------------+
          |   BACKEND CONTAINER    |
          |   FastAPI + Uvicorn    |
          |   Port 8000            |
          +------------------------+
                      |  SQLAlchemy
                      v
          +------------------------+
          |   DATABASE CONTAINER   |
          |   PostgreSQL 16        |
          |   Port 5432            |
          +------------------------+
                      |
                named volume
                postgres_data
```

- All services communicate over the user-defined `sprint-network`.
- The backend reaches PostgreSQL at `db:5432` — never `localhost`.
- Data persists in the `postgres_data` named volume across restarts and `docker compose down`.
- Only port 3000 is exposed to the browser; backend/db ports are published to `127.0.0.1` only.
- Adminer (database admin UI) runs under the optional `tools` Compose profile.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2

## Installation

```bash
git clone https://github.com/nazrielnr/sprint.git
cd sprint
cp .env.example .env      # adjust credentials if you like
docker compose up -d --build
```

Then open **http://localhost:3000**.

On boot the backend container runs Alembic migrations and an idempotent seed (demo workspace, demo user, three projects WEB/API/DASH, 15 issues across all statuses and priorities, labels, comments, and activity).

### Docker Compose commands

```bash
docker compose up -d --build   # build and start
docker compose ps              # check services
docker compose logs -f         # view logs
docker compose down            # stop (data persists in postgres_data)
docker compose down -v         # stop and DELETE the database volume
docker compose --profile tools up -d   # start Adminer at http://localhost:8080
```

## Environment configuration

`.env` (never committed — see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `sprint` | Database user |
| `POSTGRES_PASSWORD` | `sprint_dev_password` | Database password |
| `POSTGRES_DB` | `sprint` | Database name |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allow-list origin |

The backend builds its `DATABASE_URL` from these values internally.

## API documentation

Base URL: `/api/v1`. Interactive docs (Swagger UI) at `http://localhost:8000/docs`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health |
| GET | `/health/db` | Database connectivity |
| GET/POST | `/projects` | List/create projects |
| GET/PATCH/DELETE | `/projects/{id}` | Read/update (incl. archive)/delete |
| GET/POST | `/issues` | List (filters: `project_id`, `status`, `priority`, `assignee_id` (UUID, `unassigned`), `search`, `overdue`, `page`, `limit`, `sort_by`) / create |
| GET | `/issues/counts` | Totals per status (same filters, minus `status`) |
| GET | `/issues/board` | All six columns in one request, each with its true total |
| PATCH | `/issues/bulk` | Update status/priority/assignee/labels on many issues |
| POST | `/issues/bulk/delete` | Delete many issues |
| GET/PATCH/DELETE | `/issues/{id}` | Read/update/delete an issue |
| POST | `/issues/{id}/move` | Drop into a board column at `index` (renumbers only that column) |
| GET | `/issues/{id}/comments` | List comments |
| POST | `/issues/{id}/comments` | Add comment |
| PATCH/DELETE | `/comments/{id}` | Edit/delete comment |
| GET | `/dashboard/stats` | Workspace statistics |
| GET | `/dashboard/activity` | Recent activities |
| GET | `/dashboard/projects` | Project progress |
| GET | `/activity` | Activity with `project_id`/`issue_id`/`limit` (≤100) filters |
| GET | `/users`, `/labels` | Workspace members, labels |

Status codes: 200 (GET/PATCH), 201 (POST), 204 (DELETE), 400 (business rule, e.g. duplicate identifier), 404 (not found), 422 (validation).

## Local development (without Docker)

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./dev.db AUTO_MIGRATE=true
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 22+):

```bash
cd frontend
npm install
npm run dev     # dev server proxies /api to localhost:8000 (override: VITE_API_TARGET=http://localhost:8010)
```

Tests and checks:

```bash
cd backend && pip install -r requirements-dev.txt && pytest   # API tests on a temporary SQLite DB
TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/scratch pytest   # same suite on Postgres (drops/recreates tables — use a scratch DB)
cd frontend && npm test                                       # Vitest: picker + optimistic update/undo/rollback
cd frontend && npm run build                                  # type-check + production build
node frontend/scripts/contrast-audit.mjs                      # WCAG AA contrast of every theme x accent pair, incl. real backgrounds (fills, tints)
```

After pulling this version, rebuild so the new migration (`0002`, adds `issues.position`) runs: `docker compose up --build`.

## Screenshots

*(Add: container status `docker compose ps`, API responses, board view, dashboard, persistence check.)*

## Links

- **GitHub repository:** https://github.com/nazrielnr/sprint
- **Article:** [Membangun Sprint — Workspace Manajemen Proyek dengan React, FastAPI, dan Docker](https://medium.com/@nazrielnur25/membangun-sprint-workspace-manajemen-proyek-dengan-react-fastapi-dan-docker-b35dbf213526)
- **YouTube demo:** https://youtu.be/G6ZCtXWr5G0

## AI Usage Declaration

This project was designed and directed by the author: the product requirements, architecture decisions, feature set, UX, and all refinements and bug fixes are the author's own work. An AI coding agent was used only to generate the initial project scaffold (boilerplate for the FastAPI backend, the React frontend, and the Docker setup) based on the author's specification. Every line of generated scaffolding was reviewed, tested, corrected, and substantially extended by the author before being committed.

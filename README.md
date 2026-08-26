# BodyLog

A private, local-first personal body metrics tracker — weight, measurements, body composition, nutrition, and progress photos, with a web dashboard and a Telegram bot for quick logging from your phone.

## Features

- **Weight tracking** — log daily weight, view trend chart, 7-day average vs. previous 7-day average, total progress since your first entry
- **Measurements** — neck, chest, bicep (single or left/right), waist, hip, thigh (single or left/right), calf
- **Body composition** — body fat %, lean mass %, body water %, bone mass
- **Nutrition** — calories in, protein, carbs, fat (per day)
- **Progress photos** — upload/view/delete photos attached to a specific date
- **Goal tracking** — set a goal weight (or min/max range), start weight/date, target date; dashboard shows % progress toward goal
- **Daily notes** — free-text note per log entry
- **Day detail view** — drill into any date to see/edit everything logged that day
- **Telegram bot** — log values and check status from Telegram without opening the dashboard (see [Telegram Bot](#telegram-bot) below)
- **Mobile access** — dashboard is reachable from your phone over the same Wi-Fi network

## Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Python + FastAPI + uvicorn
- **Storage:** local JSON file (`data/data.json`), thread-safe writes; progress photos stored in `data/images/`
- **Telegram:** `python-telegram-bot`, runs as a background task inside the FastAPI process (long-polling, no inbound port needed)

## Prerequisites

- `python3`
- `node` + `npm`

`start.sh` creates the Python virtual environment and installs both Python and npm dependencies automatically on first run.

## Configuration

All configuration lives in a single `.env` file at the project root. Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
|---|---|---|
| `BACKEND_PORT` | Port the FastAPI backend listens on. Also used by the frontend's `/api` proxy target, so this is the single source of truth. | `8101` |
| `BACKEND_HOST` | Host/interface the backend binds to. Use `0.0.0.0` to allow LAN access. | `0.0.0.0` |
| `FRONTEND_PORT` | Port the Vite dev server listens on. | `5173` |
| `DASHBOARD_URL` | Full URL sent in Telegram messages/links to open the dashboard. **Not derived automatically** — if you change `FRONTEND_PORT` or your machine's LAN IP, update this too (e.g. `http://192.168.1.10:5173`). | `http://localhost:5173` |
| `TELEGRAM_BOT_TOKEN` | Your bot's token from BotFather. Leave unset to run without the Telegram bot. | — |
| `TELEGRAM_ALLOWED_CHAT_ID` | Your personal Telegram chat ID — only this chat can control the bot. | — |

Changing ports only requires editing `.env` — no other files need to change.

### Getting a Telegram bot token and chat ID

1. **Bot token:** open Telegram, message **[@BotFather](https://t.me/BotFather)**, send `/newbot`, and follow the prompts (choose a name and a username ending in `bot`). BotFather replies with a token like `123456789:AAExampleTokenHere` — put this in `TELEGRAM_BOT_TOKEN`.
2. **Chat ID:** message **[@userinfobot](https://t.me/userinfobot)** on Telegram — it replies with your numeric chat ID. Put this in `TELEGRAM_ALLOWED_CHAT_ID`. This restricts the bot to only respond to you.
3. Restart the app (`./stop.sh` then `./start.sh`) after editing `.env` so the bot picks up the new token.

## Starting the app

```bash
./start.sh
```

This will:
- create/activate the Python virtualenv and install backend dependencies
- install frontend dependencies on first run
- start the backend (uvicorn) and frontend (Vite) in the background
- wait until the backend responds, then print the dashboard URLs (PC and mobile)

Logs are written to `logs/backend.log` and `logs/frontend.log`.

Open the dashboard at `http://localhost:5173` (or the LAN URL printed for mobile access).

### Note on stopping via Ctrl+C

`start.sh` only cleans up its backend/frontend processes if you stop it with **Ctrl+C in the same terminal**. Closing the terminal window instead (without Ctrl+C) does **not** stop them — they keep running in the background until the machine restarts or you stop them manually. Use `stop.sh` for that.

## Stopping the app

```bash
./stop.sh
```

This finds whatever process is listening on `BACKEND_PORT`/`FRONTEND_PORT` (as configured in `.env`) and kills it — so it works regardless of how the app was started (foreground terminal, closed terminal, detached background process, etc.).

## Ports used

| Port | Used by | Notes |
|---|---|---|
| `5173` (configurable) | Frontend — Vite dev server | Also proxies `/api/*` requests to the backend |
| `8101` (configurable) | Backend — FastAPI/uvicorn | REST API |

The Telegram bot does **not** use a port — it long-polls Telegram's servers as a background task inside the backend process.

## Project structure

```
start.sh                     # start backend + frontend
stop.sh                      # stop backend + frontend
.env                         # all configuration (ports, Telegram credentials)
backend/
  main.py                    # FastAPI app entry + Telegram bot lifespan
  data_layer/
    json_storage.py          # thread-safe JSON CRUD
    models.py                # Pydantic models
  api/routes/
    logs.py                  # /api/logs — create/read/update/delete daily logs
    user.py                  # /api/user — profile & goals
    stats.py                 # /api/stats/summary — computed dashboard stats
    photos.py                # /api/photos — progress photo upload/list/delete
data/
  data.json                  # all log + user data
  images/                    # uploaded progress photos
frontend/
  src/App.jsx                # root component
  src/hooks/useBodyLog.js    # central data-fetching hook
  src/components/            # Dashboard, Header, WeightChart, WeightStats, WeightBody,
                              # Measurements, BodyComposition, ProgressGoal, AddPanel,
                              # DayDetail, DatePicker
tgbot/
  bot.py                     # Telegram bot command/message handlers
logs/
  backend.log, frontend.log  # runtime logs
```

## API surface

- `GET/POST/PUT/DELETE /api/logs`, `POST /api/logs/upsert`
- `GET/PUT /api/user`
- `GET /api/stats/summary`
- `GET/POST/DELETE /api/photos/{date}`
- `GET /api/status`

## Telegram bot

Once `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_CHAT_ID` are set in `.env` and the app is (re)started:

**Commands**
- `/start` — main menu
- `/help` — full command list
- `/status` — backend status + today's logging status
- `/dashboard` — get the dashboard link
- `/view` — today's log
- `/view YYYY-MM-DD` — log for a specific date

**Quick entry** (plain text, always logs for today):

```
weight 101.4        waist 33.5         neck 15.7
chest 37.4           bicep 15.0         hip 37.4
thigh 23.6           calories 2000      protein 150
carbs 200            fat 70             bodyfat 27.4
```

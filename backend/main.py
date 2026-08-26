import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).parent))

from api.routes import logs, photos, stats, user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent.parent / "logs" / "backend.log"),
    ],
)
logger = logging.getLogger("bodylog")

_bot_task: asyncio.Task | None = None


async def _run_telegram_bot():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.info("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled")
        return
    try:
        tgbot_path = Path(__file__).parent.parent / "tgbot"
        sys.path.insert(0, str(tgbot_path))
        print(f"Added {tgbot_path} to sys.path for Telegram bot")
        from bot import run_bot
        logger.info("Starting Telegram bot...")
        await run_bot()
    except Exception as e:
        logger.error(f"Telegram bot error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _bot_task
    _bot_task = asyncio.create_task(_run_telegram_bot())
    yield
    if _bot_task and not _bot_task.done():
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="BodyLog API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logs.router,   prefix="/api/logs",   tags=["logs"])
app.include_router(user.router,   prefix="/api/user",   tags=["user"])
app.include_router(stats.router,  prefix="/api/stats",  tags=["stats"])
app.include_router(photos.router, prefix="/api/photos", tags=["photos"])


@app.get("/api/status")
def status():
    return {
        "status": "ok",
        "backend": "running",
        "telegram_configured": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
    }


if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)

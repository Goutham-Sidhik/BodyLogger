import asyncio
import logging
import os
import sys
from datetime import date
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from data_layer import json_storage as db

logger = logging.getLogger("bodylog.tgbot")

ALLOWED_CHAT_ID = int(os.getenv("TELEGRAM_ALLOWED_CHAT_ID", "0"))
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5173")

print(f"Telegram bot allowed chat_id={ALLOWED_CHAT_ID}, dashboard={DASHBOARD_URL}")
# Maps bot command keyword → storage key in measurements dict
MEASUREMENT_MAP = {
    "neck":  "neck",
    "chest": "chest",
    "bicep": "bicep",
    "waist": "waist_belly",   # stored as waist_belly to match the app
    "hip":   "hip",
    "thigh": "thigh",
}

MEASUREMENT_LABELS = {
    "neck":  "Neck",
    "chest": "Chest",
    "bicep": "Bicep",
    "waist": "Waist",
    "hip":   "Hip",
    "thigh": "Thigh",
}

NUTRITION_KEYS = {
    "calories": "calories_in",
    "cals":     "calories_in",
    "protein":  "protein_g",
    "carbs":    "carbs_g",
    "fat":      "fat_g",
}


def _auth(update: Update) -> bool:
    cid = update.effective_chat.id
    if ALLOWED_CHAT_ID and cid != ALLOWED_CHAT_ID:
        logger.warning(f"Rejected access from chat_id={cid}")
        return False
    return True


def _main_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📊 View Today", callback_data="view_today"),
         InlineKeyboardButton("📅 View Week", callback_data="view_week")],
        [InlineKeyboardButton("🌐 Open Dashboard", url=DASHBOARD_URL)],
        [InlineKeyboardButton("❓ Help", callback_data="help")],
    ])


def _format_log(log: dict, date_str: str) -> str:
    if not log:
        return f"📭 No entry for {date_str} yet.\n\nTry: `weight 101.0`"

    lines = [f"📋 *Log — {date_str}*\n"]

    if log.get("weight"):
        lines.append(f"⚖️ Weight: *{log['weight']} kg*")

    m = log.get("measurements") or {}
    mlines = []
    for key, label in [
        ("neck", "Neck"), ("chest", "Chest"), ("bicep", "Bicep"),
        ("waist_belly", "Waist"), ("hip", "Hip"), ("thigh", "Thigh"),
    ]:
        if m.get(key):
            mlines.append(f"  • {label}: {m[key]} in")
    if mlines:
        lines.append("\n📏 *Measurements:*")
        lines.extend(mlines)

    bc = log.get("body_composition") or {}
    if bc.get("body_fat_pct"):
        lines.append(f"\n🔬 Body Fat: *{bc['body_fat_pct']}%*")

    n = log.get("nutrition") or {}
    nlines = []
    if n.get("calories_in"): nlines.append(f"  • Calories: {n['calories_in']} kcal")
    if n.get("protein_g"):   nlines.append(f"  • Protein: {n['protein_g']}g")
    if n.get("carbs_g"):     nlines.append(f"  • Carbs: {n['carbs_g']}g")
    if n.get("fat_g"):       nlines.append(f"  • Fat: {n['fat_g']}g")
    if nlines:
        lines.append("\n🥗 *Nutrition:*")
        lines.extend(nlines)

    if log.get("notes"):
        lines.append(f"\n📝 {log['notes']}")

    return "\n".join(lines)


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    user = db.get_user()
    name = user.get("name", "there")
    await update.message.reply_text(
        f"👋 Hey {name}! BodyLog is running.\n\nWhat would you like to do?",
        reply_markup=_main_keyboard(),
    )


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    text = (
        "*BodyLog Commands*\n\n"
        "`/start` — Show main menu\n"
        "`/status` — Check backend status\n"
        "`/view` — Today's log\n"
        "`/view YYYY-MM-DD` — Log for a specific date\n"
        "`/dashboard` — Get dashboard link\n\n"
        "*Quick entry (always logs for today):*\n"
        "`weight 101.4` — Weight in kg\n"
        "`waist 33.5` — Waist circumference (in)\n"
        "`neck 15.7` — Neck (in)\n"
        "`chest 37.4` — Chest (in)\n"
        "`bicep 15.0` — Bicep (in)\n"
        "`hip 37.4` — Hip (in)\n"
        "`thigh 23.6` — Thigh (in)\n"
        "`calories 2000` — Calories in\n"
        "`protein 150` — Protein (g)\n"
        "`carbs 200` — Carbs (g)\n"
        "`fat 70` — Fat (g)\n"
        "`bodyfat 27.4` — Body fat %\n"
    )
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    logs = db.get_all_logs()
    user = db.get_user()
    today_log = db.get_log_by_date(date.today().isoformat())
    today_str = "✅ logged" if today_log else "⬜ not yet"
    await update.message.reply_text(
        f"✅ *BodyLog Status*\n\n"
        f"• Backend: Running\n"
        f"• Total logs: {len(logs)}\n"
        f"• Today: {today_str}\n"
        f"• User: {user.get('name', 'N/A')}\n"
        f"• Dashboard: {DASHBOARD_URL}",
        parse_mode="Markdown",
        reply_markup=_main_keyboard(),
    )


async def cmd_dashboard(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    await update.message.reply_text(
        f"🌐 *Dashboard*\n\n[Open Dashboard]({DASHBOARD_URL})\n\n"
        f"_(Requires same network as the host PC)_",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🌐 Open Dashboard", url=DASHBOARD_URL)]
        ]),
    )


async def cmd_view(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    # Support: /view or /view YYYY-MM-DD
    args = ctx.args or []
    if args:
        date_str = args[0]
    else:
        date_str = date.today().isoformat()

    log = db.get_log_by_date(date_str)
    text = _format_log(log, date_str)
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=_main_keyboard())


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not _auth(update):
        return
    text = (update.message.text or "").strip().lower()
    parts = text.split()
    if len(parts) < 2:
        await update.message.reply_text(
            "Use commands like:\n`weight 101.4`\n`waist 33.5`\n`/help` for full list",
            parse_mode="Markdown",
        )
        return

    key = parts[0]
    try:
        value = float(parts[1])
    except ValueError:
        await update.message.reply_text(
            "⚠️ Value must be a number. e.g. `weight 101.4`",
            parse_mode="Markdown",
        )
        return

    today = date.today().isoformat()

    if key == "weight":
        db.upsert_log({"date": today, "weight": value})
        await update.message.reply_text(f"✅ Weight updated to *{value} kg*", parse_mode="Markdown")

    elif key in ("bodyfat", "body_fat", "bf"):
        db.upsert_log({"date": today, "body_composition": {"body_fat_pct": value}})
        await update.message.reply_text(f"✅ Body fat updated to *{value}%*", parse_mode="Markdown")

    elif key in MEASUREMENT_MAP:
        storage_key = MEASUREMENT_MAP[key]
        label = MEASUREMENT_LABELS[key]
        db.upsert_log({"date": today, "measurements": {storage_key: value}})
        await update.message.reply_text(f"✅ {label} updated to *{value} in*", parse_mode="Markdown")

    elif key in NUTRITION_KEYS:
        nkey = NUTRITION_KEYS[key]
        unit = "" if nkey == "calories_in" else "g"
        stored_val = int(value) if nkey == "calories_in" else value
        db.upsert_log({"date": today, "nutrition": {nkey: stored_val}})
        await update.message.reply_text(
            f"✅ {key.capitalize()} updated to *{value}{unit}*",
            parse_mode="Markdown",
        )

    else:
        await update.message.reply_text(
            f"❓ Unknown field `{key}`\n\nTry `/help` for all commands.",
            parse_mode="Markdown",
        )


async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "help":
        await query.message.reply_text(
            "Use `/help` for full command list.", parse_mode="Markdown"
        )

    elif data == "view_today":
        today = date.today().isoformat()
        log = db.get_log_by_date(today)
        text = _format_log(log, today)
        await query.message.reply_text(text, parse_mode="Markdown", reply_markup=_main_keyboard())

    elif data == "view_week":
        logs = db.get_all_logs()[:7]
        if not logs:
            await query.message.reply_text("No entries yet.")
            return
        lines = ["📅 *Last 7 Entries*\n"]
        for l in logs:
            w = f"{l['weight']} kg" if l.get("weight") else "—"
            bf = ""
            bc = l.get("body_composition") or {}
            if bc.get("body_fat_pct"):
                bf = f" · {bc['body_fat_pct']}% fat"
            lines.append(f"• {l['date']}: {w}{bf}")
        await query.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def run_bot():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("No TELEGRAM_BOT_TOKEN found — bot not started")
        return

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("dashboard", cmd_dashboard))
    app.add_handler(CommandHandler("view", cmd_view))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Use the low-level async API instead of run_polling() so we don't conflict
    # with uvicorn's existing event loop (run_polling manages its own loop lifecycle).
    await app.initialize()
    await app.start()
    await app.updater.start_polling(allowed_updates=Update.ALL_TYPES)
    logger.info("Telegram bot polling...")
    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        pass
    finally:
        await app.updater.stop()
        await app.stop()
        await app.shutdown()

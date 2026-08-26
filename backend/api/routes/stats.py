from datetime import date, timedelta
from fastapi import APIRouter
from data_layer import json_storage as db

router = APIRouter()


def _safe_avg(values):
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


@router.get("/summary")
def get_summary():
    logs = db.get_all_logs()
    user = db.get_user()

    weights = [l["weight"] for l in logs if l.get("weight") is not None]
    dates_with_weight = [l["date"] for l in logs if l.get("weight") is not None]

    today_str = date.today().isoformat()
    cutoff_7d  = (date.today() - timedelta(days=6)).isoformat()
    prev_start = (date.today() - timedelta(days=13)).isoformat()

    recent_weights = [
        l["weight"] for l in logs
        if l.get("weight") is not None and l["date"] >= cutoff_7d
    ]
    prev_weights = [
        l["weight"] for l in logs
        if l.get("weight") is not None and prev_start <= l["date"] < cutoff_7d
    ]

    seven_day_avg  = _safe_avg(recent_weights)
    prev_7_day_avg = _safe_avg(prev_weights)

    latest_weight       = weights[0] if weights else None
    oldest_entry_weight = weights[-1] if weights else None
    oldest_entry_date   = dates_with_weight[-1] if dates_with_weight else None

    # total_progress is always from the oldest log entry (not a fixed profile value)
    total_progress = (
        round(latest_weight - oldest_entry_weight, 1)
        if latest_weight is not None and oldest_entry_weight is not None
        else None
    )

    goal_weight = user.get("goal_weight")
    if goal_weight:
        goal_min = round(goal_weight - 2, 1)
        goal_max = round(goal_weight + 2, 1)
        goal_mid = goal_weight
    else:
        goal_min = user.get("goal_weight_min")
        goal_max = user.get("goal_weight_max")
        goal_mid = ((goal_min or 0) + (goal_max or 0)) / 2 if goal_min and goal_max else None

    # progress_pct uses the user's configured start_weight, falling back to oldest entry
    start_weight = user.get("start_weight") or oldest_entry_weight
    progress_pct = None
    if start_weight and goal_mid and latest_weight:
        total_to_lose = start_weight - goal_mid
        lost_so_far   = start_weight - latest_weight
        if total_to_lose != 0:
            progress_pct = round(max(0, min(100, (lost_so_far / total_to_lose) * 100)), 1)

    # Find most recent log that has non-empty measurements
    latest_measurements = {}
    for log in logs:
        m = log.get("measurements") or {}
        if any(v is not None for v in m.values()):
            latest_measurements = m
            break

    # Find most recent log that has non-empty body composition
    latest_body_comp = {}
    for log in logs:
        bc = log.get("body_composition") or {}
        if any(v is not None for v in bc.values()):
            latest_body_comp = bc
            break

    chart_data = [
        {"date": l["date"], "weight": l["weight"]}
        for l in reversed(logs)
        if l.get("weight")
    ]

    return {
        "latest_weight":       latest_weight,
        "seven_day_avg":       seven_day_avg,
        "prev_7_day_avg":      prev_7_day_avg,
        "total_progress":      total_progress,
        "oldest_entry_weight": oldest_entry_weight,
        "oldest_entry_date":   oldest_entry_date,
        "progress_pct":        progress_pct,
        "start_weight":        start_weight,
        "goal_weight":         goal_weight or goal_mid,
        "goal_weight_min":     goal_min,
        "goal_weight_max":     goal_max,
        "start_date":          user.get("start_date"),
        "target_date":         user.get("target_date"),
        "height_cm":           user.get("height_cm"),
        "latest_body_composition": latest_body_comp,
        "latest_measurements":     latest_measurements,
        "chart_data":          chart_data,
        "total_logs":          len(logs),
    }

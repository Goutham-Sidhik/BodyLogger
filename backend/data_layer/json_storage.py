import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_FILE = Path(__file__).parent.parent.parent / "data" / "data.json"

_lock = threading.Lock()

DEFAULT_DATA: Dict[str, Any] = {
    "user": {
        "name": "Goutham",
        "goal_weight_min": 75.0,
        "goal_weight_max": 80.0,
        "start_weight": None,
        "start_date": None,
        "target_date": None,
        "height_cm": None,
    },
    "logs": [],
}


def _read_file() -> Dict[str, Any]:
    if not DATA_FILE.exists():
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        _write_file(DEFAULT_DATA)
        return DEFAULT_DATA
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return DEFAULT_DATA


def _write_file(data: Dict[str, Any]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    tmp.replace(DATA_FILE)


# ── User ──────────────────────────────────────────────────────────────────────

def get_user() -> Dict[str, Any]:
    with _lock:
        return _read_file().get("user", DEFAULT_DATA["user"])


def update_user(updates: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        data = _read_file()
        user = data.get("user", dict(DEFAULT_DATA["user"]))
        for k, v in updates.items():
            if v is not None:
                user[k] = v
        data["user"] = user
        _write_file(data)
        return user


# ── Logs ──────────────────────────────────────────────────────────────────────

def get_all_logs() -> List[Dict[str, Any]]:
    with _lock:
        logs = _read_file().get("logs", [])
        return sorted(logs, key=lambda x: x["date"], reverse=True)


def get_log_by_date(date: str) -> Optional[Dict[str, Any]]:
    with _lock:
        for log in _read_file().get("logs", []):
            if log["date"] == date:
                return log
        return None


def create_log(log: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        data = _read_file()
        logs = data.get("logs", [])
        for existing in logs:
            if existing["date"] == log["date"]:
                raise ValueError(f"Log for {log['date']} already exists")
        now = datetime.now().isoformat()
        log["created_at"] = now
        log["updated_at"] = now
        logs.append(log)
        data["logs"] = logs
        _write_file(data)
        return log


def update_log(date: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _lock:
        data = _read_file()
        logs = data.get("logs", [])
        for i, log in enumerate(logs):
            if log["date"] == date:
                for k, v in updates.items():
                    if isinstance(v, dict) and isinstance(log.get(k), dict):
                        for sk, sv in v.items():
                            if sv is not None:
                                log[k][sk] = sv
                    elif v is not None:
                        log[k] = v
                log["updated_at"] = datetime.now().isoformat()
                logs[i] = log
                data["logs"] = logs
                _write_file(data)
                return log
        return None


def upsert_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
    date = log_data["date"]
    existing = get_log_by_date(date)
    if existing:
        updates = {k: v for k, v in log_data.items() if k not in ("date", "created_at")}
        return update_log(date, updates)
    return create_log(log_data)


def delete_log(date: str) -> bool:
    with _lock:
        data = _read_file()
        logs = data.get("logs", [])
        filtered = [l for l in logs if l["date"] != date]
        if len(filtered) == len(logs):
            return False
        data["logs"] = filtered
        _write_file(data)
        return True


BLANK_USER: Dict[str, Any] = {
    "name": "",
    "goal_weight_min": None,
    "goal_weight_max": None,
    "start_weight": None,
    "start_date": None,
    "target_date": None,
    "height_cm": None,
}


def clear_all_data() -> None:
    images_dir = DATA_FILE.parent / "images"
    with _lock:
        data = _read_file()
        data["logs"] = []
        data["user"] = dict(BLANK_USER)
        _write_file(data)
    if images_dir.exists():
        for f in images_dir.iterdir():
            if f.is_file():
                f.unlink()

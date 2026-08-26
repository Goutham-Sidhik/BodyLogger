from fastapi import APIRouter, HTTPException
from typing import List

from data_layer import json_storage as db
from data_layer.models import Log, LogCreate, LogUpdate

router = APIRouter()


def _build_log_dict(payload) -> dict:
    d: dict = {"date": payload.date}
    if payload.weight is not None:
        d["weight"] = payload.weight
    if payload.measurements:
        d["measurements"] = payload.measurements.model_dump(exclude_none=False)
    else:
        d["measurements"] = {}
    if payload.body_composition:
        d["body_composition"] = payload.body_composition.model_dump(exclude_none=False)
    else:
        d["body_composition"] = {}
    if payload.nutrition:
        d["nutrition"] = payload.nutrition.model_dump(exclude_none=False)
    else:
        d["nutrition"] = {}
    if hasattr(payload, "notes") and payload.notes:
        d["notes"] = payload.notes
    return d


@router.get("", response_model=List[dict])
def list_logs():
    return db.get_all_logs()


@router.get("/{date}")
def get_log(date: str):
    log = db.get_log_by_date(date)
    if not log:
        raise HTTPException(status_code=404, detail=f"No log found for {date}")
    return log


@router.post("", status_code=201)
def create_log(payload: LogCreate):
    try:
        log_dict = _build_log_dict(payload)
        return db.create_log(log_dict)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/upsert", status_code=200)
def upsert_log(payload: LogCreate):
    log_dict = _build_log_dict(payload)
    return db.upsert_log(log_dict)


@router.put("/{date}")
def update_log(date: str, payload: LogUpdate):
    updates: dict = {}
    if payload.weight is not None:
        updates["weight"] = payload.weight
    if payload.measurements:
        updates["measurements"] = payload.measurements.model_dump(exclude_none=False)
    if payload.body_composition:
        updates["body_composition"] = payload.body_composition.model_dump(exclude_none=False)
    if payload.nutrition:
        updates["nutrition"] = payload.nutrition.model_dump(exclude_none=False)
    if payload.notes is not None:
        updates["notes"] = payload.notes

    result = db.update_log(date, updates)
    if not result:
        raise HTTPException(status_code=404, detail=f"No log found for {date}")
    return result


@router.delete("")
def clear_all_logs():
    db.clear_all_data()
    return {"cleared": True}


@router.delete("/{date}")
def delete_log(date: str):
    if not db.delete_log(date):
        raise HTTPException(status_code=404, detail=f"No log found for {date}")
    return {"deleted": date}

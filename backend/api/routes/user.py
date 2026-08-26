from fastapi import APIRouter
from data_layer import json_storage as db
from data_layer.models import UserProfile, UserUpdate

router = APIRouter()


@router.get("")
def get_user():
    return db.get_user()


@router.put("")
def update_user(payload: UserUpdate):
    updates = payload.model_dump(exclude_none=True)
    return db.update_user(updates)

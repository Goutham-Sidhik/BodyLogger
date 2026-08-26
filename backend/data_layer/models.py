from pydantic import BaseModel, Field
from typing import Optional


class Measurements(BaseModel):
    neck: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    waist_belly: Optional[float] = None
    waist_narrow: Optional[float] = None
    bicep: Optional[float] = None
    bicep_right: Optional[float] = None
    bicep_left: Optional[float] = None
    thigh: Optional[float] = None
    thigh_right: Optional[float] = None
    thigh_left: Optional[float] = None
    knee: Optional[float] = None  # kept for backward compat with existing data
    calf: Optional[float] = None
    hip: Optional[float] = None


class BodyComposition(BaseModel):
    body_fat_pct: Optional[float] = None
    lean_mass_pct: Optional[float] = None
    body_water_pct: Optional[float] = None
    bone_mass_kg: Optional[float] = None


class Nutrition(BaseModel):
    calories_in: Optional[int] = None
    calories_out: Optional[int] = None  # kept for backward compat
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class Log(BaseModel):
    date: str
    weight: Optional[float] = None
    measurements: Measurements = Field(default_factory=Measurements)
    body_composition: BodyComposition = Field(default_factory=BodyComposition)
    nutrition: Nutrition = Field(default_factory=Nutrition)
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class LogCreate(BaseModel):
    date: str
    weight: Optional[float] = None
    measurements: Optional[Measurements] = None
    body_composition: Optional[BodyComposition] = None
    nutrition: Optional[Nutrition] = None
    notes: Optional[str] = None


class LogUpdate(BaseModel):
    weight: Optional[float] = None
    measurements: Optional[Measurements] = None
    body_composition: Optional[BodyComposition] = None
    nutrition: Optional[Nutrition] = None
    notes: Optional[str] = None


class UserProfile(BaseModel):
    name: str = "Goutham"
    goal_weight: Optional[float] = None      # single target; backend computes ±2 range
    goal_weight_min: Optional[float] = None  # kept for backward compat
    goal_weight_max: Optional[float] = None  # kept for backward compat
    start_weight: Optional[float] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    height_cm: Optional[float] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    goal_weight: Optional[float] = None
    goal_weight_min: Optional[float] = None
    goal_weight_max: Optional[float] = None
    start_weight: Optional[float] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    height_cm: Optional[float] = None

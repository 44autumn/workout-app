from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


# ── Exercise ──────────────────────────────────────────────────────────────────

class ExerciseOut(BaseModel):
    id: int
    name: str
    muscle_group_id: int

    model_config = {"from_attributes": True}


# ── MuscleGroup ───────────────────────────────────────────────────────────────

class MuscleGroupOut(BaseModel):
    id: int
    name: str
    color: str
    exercises: List[ExerciseOut] = []

    model_config = {"from_attributes": True}


# ── WorkoutSet ────────────────────────────────────────────────────────────────

class WorkoutSetCreate(BaseModel):
    exercise_id: int
    weight_kg: Decimal
    reps: int
    set_number: int


class WorkoutSetUpdate(BaseModel):
    weight_kg: Optional[Decimal] = None
    reps: Optional[int] = None


class WorkoutSetOut(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    exercise_name: str
    muscle_group_id: int
    muscle_group_color: str
    weight_kg: Decimal
    reps: int
    set_number: int

    model_config = {"from_attributes": True}


# ── WorkoutSession ────────────────────────────────────────────────────────────

class WorkoutSessionCreate(BaseModel):
    date: date
    notes: Optional[str] = None


class WorkoutSessionOut(BaseModel):
    id: int
    date: date
    notes: Optional[str]
    created_at: Optional[datetime]
    sets: List[WorkoutSetOut] = []

    model_config = {"from_attributes": True}


# ── Calendar ──────────────────────────────────────────────────────────────────

class CalendarDay(BaseModel):
    date: date
    muscle_group_ids: List[int]
    colors: List[str]

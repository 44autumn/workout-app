from datetime import date as date_type
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    MuscleGroupOut,
    WorkoutSessionCreate,
    WorkoutSessionOut,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    WorkoutSetOut,
    CalendarDay,
)
import crud

router = APIRouter()


# ── Muscle Groups ─────────────────────────────────────────────────────────────

@router.get("/muscle-groups", response_model=List[MuscleGroupOut])
async def list_muscle_groups(db: AsyncSession = Depends(get_db)):
    groups = await crud.get_muscle_groups(db)
    return groups


# ── Calendar ──────────────────────────────────────────────────────────────────

@router.get("/workouts/calendar", response_model=List[CalendarDay])
async def get_calendar(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_calendar_month(db, year, month)


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/workouts/history", response_model=List[WorkoutSessionOut])
async def get_history(db: AsyncSession = Depends(get_db)):
    return await crud.get_recent_sessions(db)


# ── Session by date ───────────────────────────────────────────────────────────

@router.get("/workouts/{target_date}", response_model=WorkoutSessionOut)
async def get_session_by_date(
    target_date: date_type,
    db: AsyncSession = Depends(get_db),
):
    session = await crud.get_session_by_date(db, target_date)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    from crud import _session_to_out
    return _session_to_out(session)


# ── Create Session ────────────────────────────────────────────────────────────

@router.post("/workouts", response_model=WorkoutSessionOut)
async def create_session(
    data: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    # Return existing if already exists
    existing = await crud.get_session_by_date(db, data.date)
    if existing:
        from crud import _session_to_out
        return _session_to_out(existing)
    session = await crud.create_session(db, data)
    return WorkoutSessionOut(
        id=session.id,
        date=session.date,
        notes=session.notes,
        created_at=session.created_at,
        sets=[],
    )


# ── Delete Session ────────────────────────────────────────────────────────────

@router.delete("/workouts/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_session(db, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


# ── Add Set ───────────────────────────────────────────────────────────────────

@router.post("/workouts/{session_id}/sets", response_model=WorkoutSetOut)
async def add_set(
    session_id: int,
    data: WorkoutSetCreate,
    db: AsyncSession = Depends(get_db),
):
    return await crud.add_set(db, session_id, data)


# ── Update Set ────────────────────────────────────────────────────────────────

@router.put("/workouts/sets/{set_id}", response_model=WorkoutSetOut)
async def update_set(
    set_id: int,
    data: WorkoutSetUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await crud.update_set(db, set_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Set not found")
    return result


# ── Delete Set ────────────────────────────────────────────────────────────────

@router.delete("/workouts/sets/{set_id}")
async def delete_set(set_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_set(db, set_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Set not found")
    return {"ok": True}

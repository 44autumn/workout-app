from datetime import date as date_type
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from models import MuscleGroup, Exercise, WorkoutSession, WorkoutSet
from schemas import (
    WorkoutSessionCreate,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    WorkoutSetOut,
    WorkoutSessionOut,
    CalendarDay,
)


# ── MuscleGroups ──────────────────────────────────────────────────────────────

async def get_muscle_groups(db: AsyncSession) -> List[MuscleGroup]:
    result = await db.execute(
        select(MuscleGroup).options(selectinload(MuscleGroup.exercises))
    )
    return result.scalars().all()


# ── WorkoutSession ────────────────────────────────────────────────────────────

async def get_session_by_date(db: AsyncSession, target_date: date_type) -> Optional[WorkoutSession]:
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.date == target_date)
        .options(
            selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group)
        )
    )
    return result.scalar_one_or_none()


async def create_session(db: AsyncSession, data: WorkoutSessionCreate) -> WorkoutSession:
    session = WorkoutSession(date=data.date, notes=data.notes)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def delete_session(db: AsyncSession, session_id: int) -> bool:
    result = await db.execute(
        select(WorkoutSession).where(WorkoutSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return False
    await db.delete(session)
    await db.commit()
    return True


# ── WorkoutSet ────────────────────────────────────────────────────────────────

async def add_set(db: AsyncSession, session_id: int, data: WorkoutSetCreate) -> WorkoutSetOut:
    ws = WorkoutSet(
        session_id=session_id,
        exercise_id=data.exercise_id,
        weight_kg=data.weight_kg,
        reps=data.reps,
        set_number=data.set_number,
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)

    # load related
    result = await db.execute(
        select(WorkoutSet)
        .where(WorkoutSet.id == ws.id)
        .options(
            selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group)
        )
    )
    ws = result.scalar_one()
    return _set_to_out(ws)


async def update_set(db: AsyncSession, set_id: int, data: WorkoutSetUpdate) -> Optional[WorkoutSetOut]:
    result = await db.execute(
        select(WorkoutSet)
        .where(WorkoutSet.id == set_id)
        .options(selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group))
    )
    ws = result.scalar_one_or_none()
    if not ws:
        return None
    if data.weight_kg is not None:
        ws.weight_kg = data.weight_kg
    if data.reps is not None:
        ws.reps = data.reps
    await db.commit()
    await db.refresh(ws)

    result = await db.execute(
        select(WorkoutSet)
        .where(WorkoutSet.id == set_id)
        .options(selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group))
    )
    ws = result.scalar_one()
    return _set_to_out(ws)


async def delete_set(db: AsyncSession, set_id: int) -> bool:
    result = await db.execute(select(WorkoutSet).where(WorkoutSet.id == set_id))
    ws = result.scalar_one_or_none()
    if not ws:
        return False
    await db.delete(ws)
    await db.commit()
    return True


# ── Calendar ──────────────────────────────────────────────────────────────────

async def get_calendar_month(db: AsyncSession, year: int, month: int) -> List[CalendarDay]:
    from sqlalchemy import extract
    result = await db.execute(
        select(WorkoutSession)
        .where(
            extract("year", WorkoutSession.date) == year,
            extract("month", WorkoutSession.date) == month,
        )
        .options(
            selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group)
        )
    )
    sessions = result.scalars().all()

    days = []
    for s in sessions:
        mg_ids_seen = set()
        mg_ids = []
        colors = []
        for ws in s.sets:
            mg = ws.exercise.muscle_group
            if mg.id not in mg_ids_seen:
                mg_ids_seen.add(mg.id)
                mg_ids.append(mg.id)
                colors.append(mg.color)
        days.append(CalendarDay(date=s.date, muscle_group_ids=mg_ids, colors=colors))
    return days


# ── History ───────────────────────────────────────────────────────────────────

async def get_recent_sessions(db: AsyncSession, limit: int = 10) -> List[WorkoutSessionOut]:
    result = await db.execute(
        select(WorkoutSession)
        .order_by(WorkoutSession.date.desc())
        .limit(limit)
        .options(
            selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise).selectinload(Exercise.muscle_group)
        )
    )
    sessions = result.scalars().all()
    return [_session_to_out(s) for s in sessions]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set_to_out(ws: WorkoutSet) -> WorkoutSetOut:
    return WorkoutSetOut(
        id=ws.id,
        session_id=ws.session_id,
        exercise_id=ws.exercise_id,
        exercise_name=ws.exercise.name,
        muscle_group_id=ws.exercise.muscle_group.id,
        muscle_group_color=ws.exercise.muscle_group.color,
        weight_kg=ws.weight_kg,
        reps=ws.reps,
        set_number=ws.set_number,
    )


def _session_to_out(s: WorkoutSession) -> WorkoutSessionOut:
    sets_out = [_set_to_out(ws) for ws in sorted(s.sets, key=lambda x: (x.set_number, x.id))]
    return WorkoutSessionOut(
        id=s.id,
        date=s.date,
        notes=s.notes,
        created_at=s.created_at,
        sets=sets_out,
    )

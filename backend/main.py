import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, Base
from models import MuscleGroup, Exercise
from routers.workouts import router

# ── Preset data ───────────────────────────────────────────────────────────────

PRESETS = [
    ("胸", "#ef4444", ["ベンチプレス", "ダンベルフライ", "チェストプレス", "腕立て伏せ"]),
    ("背中", "#3b82f6", ["懸垂", "ラットプルダウン", "ベントオーバーロウ", "シーテッドロウ"]),
    ("脚", "#22c55e", ["スクワット", "レッグプレス", "レッグカール", "カーフレイズ"]),
    ("肩", "#a855f7", ["ショルダープレス", "サイドレイズ", "フロントレイズ"]),
    ("腕", "#f97316", ["バイセップスカール", "トライセップスプッシュダウン", "ハンマーカール"]),
    ("腹", "#eab308", ["クランチ", "プランク", "レッグレイズ"]),
]

# Lazy-initialized lock (Python 3.9 compatible — must be created inside event loop)
_init_lock: asyncio.Lock | None = None


async def _get_lock() -> asyncio.Lock:
    global _init_lock
    if _init_lock is None:
        _init_lock = asyncio.Lock()
    return _init_lock


async def init_db():
    lock = await _get_lock()
    async with lock:
        async with engine.begin() as conn:
            # Create tables
            await conn.run_sync(Base.metadata.create_all)

            # Insert presets (ignore conflicts)
            for mg_name, color, exercises in PRESETS:
                # Upsert muscle group
                await conn.execute(
                    text(
                        "INSERT INTO muscle_groups (name, color) VALUES (:name, :color) "
                        "ON CONFLICT DO NOTHING"
                    ),
                    {"name": mg_name, "color": color},
                )

            # Fetch all muscle groups to get IDs
            rows = await conn.execute(text("SELECT id, name FROM muscle_groups"))
            mg_map = {row.name: row.id for row in rows}

            for mg_name, _, exercises in PRESETS:
                mg_id = mg_map.get(mg_name)
                if mg_id is None:
                    continue
                for ex_name in exercises:
                    await conn.execute(
                        text(
                            "INSERT INTO exercises (name, muscle_group_id) VALUES (:name, :mg_id) "
                            "ON CONFLICT DO NOTHING"
                        ),
                        {"name": ex_name, "mg_id": mg_id},
                    )


# ── App ───────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await engine.dispose()


app = FastAPI(title="筋トレ管理API", lifespan=lifespan)

# CORS
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if not origins:
    origins = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}

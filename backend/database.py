import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Neon PostgreSQL uses postgres:// scheme; asyncpg needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove query params not supported by asyncpg (handled via connect_args)
import re
DATABASE_URL = re.sub(r"[?&]sslmode=[^&]+", "", DATABASE_URL)
DATABASE_URL = re.sub(r"[?&]channel_binding=[^&]+", "", DATABASE_URL)
# Clean up trailing ? or & if all params were removed
DATABASE_URL = re.sub(r"[?&]$", "", DATABASE_URL)

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

connect_args = {}
if DATABASE_URL:
    connect_args = {"ssl": ssl_context}

engine = create_async_engine(
    DATABASE_URL or "postgresql+asyncpg://localhost/workout",
    echo=False,
    connect_args=connect_args,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

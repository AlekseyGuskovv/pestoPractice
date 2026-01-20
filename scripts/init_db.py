"""
Create database tables from SQLAlchemy models.

Usage:
  python scripts/init_db.py

Will create tables in the database specified by .env (DB_NAME).
Does not seed menu data — use existing pesto_db or import data separately.
"""

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database import engine, Base  # noqa: E402
import models  # noqa: F401, E402 — register models on Base.metadata


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")


if __name__ == "__main__":
    asyncio.run(main())

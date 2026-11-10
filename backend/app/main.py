import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.db import SessionLocal, engine

settings = get_settings()

app = FastAPI(title=settings.title, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


def _run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=Path(__file__).resolve().parent.parent,
        check=True,
    )


def _seed_if_empty() -> None:
    from app.models import Workspace
    from app.seed import seed

    with SessionLocal() as db:
        if db.query(Workspace).first() is None:
            seed(db)
            db.commit()


@app.on_event("startup")
def startup() -> None:
    if settings.auto_migrate:
        _run_migrations()
        _seed_if_empty()
    else:
        # touch engine so /health/db reflects real connectivity from boot
        engine.connect().close()

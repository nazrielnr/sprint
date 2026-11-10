import os
import tempfile

# Must be set before the app imports its settings/engine.
# SQLite by default; set TEST_DATABASE_URL to run the same suite against Postgres (it drops and recreates all tables).
_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_db}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
        db.commit()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def project_id(client):
    return next(p["id"] for p in client.get("/api/v1/projects").json()["items"] if p["identifier"] == "WEB")

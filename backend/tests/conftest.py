import os, sys, tempfile, pathlib
os.environ["RESQ_DATA_DIR"] = tempfile.mkdtemp(prefix="resq_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.environ['RESQ_DATA_DIR']}/resq_test.db"
os.environ["RESQ_AUTOSIM"] = "0"  # tests drive simulation via /simulate/skip
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.main import app
    from app.seed import seed
    from app import detection
    seed(reset=True)
    detection.detector.reset()
    with TestClient(app) as c:
        yield c


def login(c, user, pw):
    r = c.post("/api/auth/login", json={"username": user, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


@pytest.fixture()
def admin(client): return login(client, "admin", "admin123")
@pytest.fixture()
def d1(client): return login(client, "driver1", "driver123")
@pytest.fixture()
def d2(client): return login(client, "driver2", "driver123")
@pytest.fixture()
def d5(client): return login(client, "driver5", "driver123")
@pytest.fixture()
def hosp1(client): return login(client, "hospital1", "hospital123")

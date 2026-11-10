from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import WorkspaceMember
from app.schemas import LabelList, LabelOut, UserList, UserOut
from app.models import Label

router = APIRouter(tags=["meta"])


@router.get("/users")
def list_users(db: Session = Depends(get_db)) -> dict:
    members = db.query(WorkspaceMember).order_by(WorkspaceMember.created_at).all()
    return {"items": [UserOut.model_validate(m.user).model_dump() for m in members]}


@router.get("/labels")
def list_labels(db: Session = Depends(get_db)) -> dict:
    labels = db.query(Label).order_by(Label.name).all()
    return {"items": [LabelOut.model_validate(l).model_dump() for l in labels]}

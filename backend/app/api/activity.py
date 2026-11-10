from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import ActivityLog
from app.schemas import ActivityList, ActivityOut

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
def list_activity(
    project_id: UUID | None = None,
    issue_id: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    q = db.query(ActivityLog)
    if project_id:
        q = q.filter(ActivityLog.project_id == project_id)
    if issue_id:
        q = q.filter(ActivityLog.issue_id == issue_id)
    rows = q.order_by(ActivityLog.created_at.desc(), ActivityLog.id).limit(limit).all()
    return {"items": [ActivityOut.model_validate(a).model_dump() for a in rows]}

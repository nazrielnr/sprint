from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Issue, Project
from app.schemas import ActivityList, ActivityOut, DashboardStats, ProjectOut, ProjectWithCounts
from app.services.dashboard import compute_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> DashboardStats:
    return DashboardStats(**compute_stats(db))


@router.get("/activity")
def activity(db: Session = Depends(get_db)) -> dict:
    from app.models import ActivityLog

    rows = db.query(ActivityLog).order_by(ActivityLog.created_at.desc(), ActivityLog.id).limit(20).all()
    return {"items": [ActivityOut.model_validate(a).model_dump() for a in rows]}


@router.get("/projects")
def projects(db: Session = Depends(get_db)) -> dict:
    rows = (
        db.query(
            Project,
            func.count(Issue.id).label("issue_count"),
            func.sum(
                case((Issue.status.in_(("done", "canceled")), 1), else_=0)
            ).label("done_count"),
        )
        .outerjoin(Issue, Issue.project_id == Project.id)
        .group_by(Project.id)
        .order_by(Project.created_at)
    )
    items = []
    for project, issue_count, done_count in rows:
        data = ProjectWithCounts.model_validate(
            {**ProjectOut.model_validate(project).model_dump(),
             "issue_count": int(issue_count or 0),
             "done_count": int(done_count or 0)}
        ).model_dump()
        items.append(data)

    return {"items": items}

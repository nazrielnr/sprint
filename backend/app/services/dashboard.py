from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Issue, Project


def compute_stats(db: Session, today: date | None = None) -> dict:
    today = today or date.today()
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_issues = db.query(func.count(Issue.id)).scalar() or 0
    in_progress = (
        db.query(func.count(Issue.id))
        .filter(Issue.status == "in_progress")
        .scalar()
        or 0
    )
    completed = (
        db.query(func.count(Issue.id))
        .filter(Issue.status.in_(("done", "canceled")))
        .scalar()
        or 0
    )
    overdue = (
        db.query(func.count(Issue.id))
        .filter(
            Issue.due_date.is_not(None),
            Issue.due_date < today,
            Issue.status.notin_(("done", "canceled")),
        )
        .scalar()
        or 0
    )
    open_count = (
        db.query(func.count(Issue.id))
        .filter(Issue.status.notin_(("done", "canceled")))
        .scalar()
        or 0
    )
    return {
        "open": open_count,
        "total_projects": total_projects,
        "total_issues": total_issues,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
    }

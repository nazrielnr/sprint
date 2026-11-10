"""Activity logging helper — always called in the same transaction as the mutation."""

from sqlalchemy.orm import Session

from app.models import ActivityLog, Workspace


def log(
    db: Session,
    action: str,
    description: str,
    project_id=None,
    issue_id=None,
) -> ActivityLog:
    ws = db.query(Workspace).first()
    entry = ActivityLog(
        workspace_id=ws.id if ws else None,
        project_id=project_id,
        issue_id=issue_id,
        action=action,
        description=description,
    )
    db.add(entry)
    return entry

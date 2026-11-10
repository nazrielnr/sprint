"""Transaction-safe issue key generation.

Strategy: bump project.counter with a locked read (with_for_update where
supported), build issue_key from identifier + zero-padded number, then INSERT.
On IntegrityError (concurrent race) retry with a fresh number; SQLite has no
SELECT ... FOR UPDATE, so it relies on the retry loop.
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Issue, Project


def generate_issue_key(db: Session, project: Project, max_retries: int = 8) -> tuple[int, str]:
    for attempt in range(max_retries):
        locked = (
            db.query(Project)
            .filter(Project.id == project.id)
            .with_for_update()
            .first()
        )
        if locked is None:
            raise ValueError(f"project {project.id} not found")
        number = locked.counter + 1
        locked.counter = number
        key = f"{locked.identifier}-{number:03d}"
        db.flush()
        # verify no collision at insert-time is handled by caller's commit retry
        exists = db.query(Issue.id).filter(Issue.project_id == project.id, Issue.issue_number == number).first()
        if exists is None:
            return number, key
        # collision (shouldn't normally happen) — loop will bump counter again
        if attempt == max_retries - 1:
            raise RuntimeError("could not allocate a unique issue number")
    raise RuntimeError("could not allocate a unique issue number")


def commit_with_retry(db: Session, project: Project, build_issue, max_retries: int = 5):
    """Commit helper: on IntegrityError from the unique (project_id, issue_number)
    constraint, roll back, re-synchronize the counter and rebuild."""
    from sqlalchemy import func

    for attempt in range(max_retries):
        try:
            db.commit()
            return
        except IntegrityError:
            db.rollback()
            mx = (
                db.query(func.coalesce(func.max(Issue.issue_number), 0))
                .filter(Issue.project_id == project.id)
                .scalar()
            )
            db.query(Project).filter(Project.id == project.id).update({"counter": mx})
            db.commit()
            issue = build_issue()
            db.add(issue)
            # retry commit
            try:
                db.commit()
                return
            except IntegrityError:
                db.rollback()
                continue
    raise RuntimeError("failed to create issue after retries")

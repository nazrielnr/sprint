from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Issue, IssueLabel, Label, Project, User, Workspace
from app.schemas import (
    ISSUE_PRIORITIES,
    ISSUE_STATUSES,
    IssueBulkDelete,
    IssueBulkUpdate,
    IssueCreate,
    IssueMove,
    IssueOut,
    IssueUpdate,
)
from app.services.activity import log as log_activity
from app.services.issue_key import generate_issue_key

router = APIRouter(prefix="/issues", tags=["issues"])

VALID_SORTS = ("created_at", "updated_at", "due_date", "priority", "status", "position")

PRIORITY_ORDER = case(
    (Issue.priority == "urgent", 1),
    (Issue.priority == "high", 2),
    (Issue.priority == "medium", 3),
    (Issue.priority == "low", 4),
    (Issue.priority == "no_priority", 5),
)
STATUS_ORDER = case(
    (Issue.status == "in_progress", 1),
    (Issue.status == "in_review", 2),
    (Issue.status == "todo", 3),
    (Issue.status == "backlog", 4),
    (Issue.status == "done", 5),
    (Issue.status == "canceled", 6),
)

# Order used inside a board column: manual position first, then priority.
COLUMN_ORDER = (Issue.position, PRIORITY_ORDER, Issue.created_at)


def first_workspace(db: Session) -> Workspace:
    ws = db.query(Workspace).first()
    if ws is None:
        raise HTTPException(status_code=404, detail="no workspace found; run seed first")
    return ws


def sync_labels(db: Session, issue: Issue, label_ids: list[UUID]):
    db.query(IssueLabel).filter(IssueLabel.issue_id == issue.id).delete()
    seen: set[UUID] = set()
    for lid in label_ids:
        if lid in seen:
            continue
        seen.add(lid)
        label = db.get(Label, lid)
        if label is None:
            raise HTTPException(status_code=422, detail=f"label {lid} not found")
        db.add(IssueLabel(issue_id=issue.id, label_id=lid))


def issue_out(issue: Issue) -> dict:
    data = IssueOut.model_validate(issue).model_dump()
    data["label_ids"] = [il.label_id for il in issue.labels]
    return data


def validate_status(value: str | None) -> None:
    if value is not None and value not in ISSUE_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {list(ISSUE_STATUSES)}")


def validate_priority(value: str | None) -> None:
    if value is not None and value not in ISSUE_PRIORITIES:
        raise HTTPException(status_code=422, detail=f"priority must be one of {list(ISSUE_PRIORITIES)}")


def apply_filters(
    q,
    *,
    project_id: UUID | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    overdue: bool = False,
):
    """Shared by list / counts / board so all three agree on what a filter means."""
    if project_id:
        q = q.filter(Issue.project_id == project_id)
    if status:
        q = q.filter(Issue.status == status)
    if priority:
        q = q.filter(Issue.priority == priority)
    if assignee_id:
        if assignee_id in ("none", "unassigned"):
            q = q.filter(Issue.assignee_id.is_(None))
        else:
            try:
                q = q.filter(Issue.assignee_id == UUID(assignee_id))
            except ValueError:
                raise HTTPException(
                    status_code=422,
                    detail="assignee_id must be a UUID, 'unassigned' or 'none'",
                )
    if search and search.strip():
        like = f"%{search.strip()}%"
        q = q.filter(or_(Issue.title.ilike(like), Issue.description.ilike(like), Issue.issue_key.ilike(like)))
    if overdue:
        q = q.filter(
            Issue.due_date.is_not(None),
            Issue.due_date < date.today(),
            Issue.status.notin_(("done", "canceled")),
        )
    return q


@router.get("")
def list_issues(
    project_id: UUID | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    overdue: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    sort_by: str = "created_at",
    db: Session = Depends(get_db),
) -> dict:
    validate_status(status)
    validate_priority(priority)
    if sort_by not in VALID_SORTS:
        raise HTTPException(status_code=422, detail=f"sort_by must be one of {list(VALID_SORTS)}")

    q = apply_filters(
        db.query(Issue),
        project_id=project_id,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        overdue=overdue,
    )
    total = q.count()
    order_cols = {
        "created_at": Issue.created_at,
        "updated_at": Issue.updated_at,
        "due_date": Issue.due_date,
        "priority": PRIORITY_ORDER,
        "status": STATUS_ORDER,
        "position": Issue.position,
    }
    q = q.order_by(order_cols[sort_by], Issue.created_at)
    items = q.offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [issue_out(i) for i in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/counts")
def issue_counts(
    project_id: UUID | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    overdue: bool = False,
    db: Session = Depends(get_db),
) -> dict:
    """Issue totals per status (one query instead of one per status)."""
    validate_priority(priority)
    q = apply_filters(
        db.query(Issue.status, func.count(Issue.id)),
        project_id=project_id,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        overdue=overdue,
    )
    by_status = {s: 0 for s in ISSUE_STATUSES}
    for status, count in q.group_by(Issue.status).all():
        by_status[status] = int(count)
    return {"total": sum(by_status.values()), "by_status": by_status}


@router.get("/board")
def board(
    project_id: UUID | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    overdue: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    """All six columns in one request, each with its true total (so 'load more' can be honest)."""
    validate_priority(priority)
    columns = {}
    for status in ISSUE_STATUSES:
        q = apply_filters(
            db.query(Issue),
            project_id=project_id,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            search=search,
            overdue=overdue,
        )
        total = q.count()
        items = q.order_by(*COLUMN_ORDER).limit(limit).all()
        columns[status] = {"items": [issue_out(i) for i in items], "total": total}
    return {"columns": columns}


@router.post("", status_code=201)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)) -> dict:
    validate_status(payload.status)
    validate_priority(payload.priority)
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="project not found")

    number, key = generate_issue_key(db, project)
    issue = Issue(
        project_id=project.id,
        issue_number=number,
        issue_key=key,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
    )
    db.add(issue)
    db.flush()
    for lid in payload.label_ids:
        label = db.get(Label, lid)
        if label is None:
            raise HTTPException(status_code=422, detail=f"label {lid} not found")
        db.add(IssueLabel(issue_id=issue.id, label_id=lid))
    log_activity(
        db,
        "issue_created",
        f"created {key} in project {project.identifier}",
        project_id=project.id,
        issue_id=issue.id,
    )
    db.commit()
    db.refresh(issue)
    return issue_out(issue)


def apply_changes(db: Session, issue: Issue, data: dict) -> None:
    """Set fields on an issue and write one activity entry per meaningful change."""
    data = dict(data)
    label_ids = data.pop("label_ids", None)
    prev = {f: getattr(issue, f) for f in ("status", "priority", "assignee_id", "due_date", "title")}
    old_labels = {il.label_id for il in issue.labels}

    for field, value in data.items():
        setattr(issue, field, value)

    if label_ids is not None:
        sync_labels(db, issue, label_ids)

    def log(action: str, text: str) -> None:
        log_activity(db, action, text, project_id=issue.project_id, issue_id=issue.id)

    key = issue.issue_key
    if "status" in data and data["status"] != prev["status"]:
        log("issue_status_changed", f"moved {key} from {prev['status']} to {issue.status}")
    if "priority" in data and data["priority"] != prev["priority"]:
        log(
            "issue_priority_changed",
            f"changed priority of {key} from {prev['priority']} to {issue.priority}",
        )
    if "assignee_id" in data and data["assignee_id"] != prev["assignee_id"]:
        if issue.assignee_id is None:
            log("issue_assignee_changed", f"unassigned {key}")
        else:
            user = db.get(User, issue.assignee_id)
            log("issue_assignee_changed", f"assigned {key} to {user.name if user else 'a user'}")
    if "due_date" in data and data["due_date"] != prev["due_date"]:
        if issue.due_date is None:
            log("issue_due_changed", f"cleared the due date of {key}")
        else:
            log("issue_due_changed", f"set the due date of {key} to {issue.due_date.isoformat()}")
    if "title" in data and data["title"] != prev["title"]:
        log("issue_renamed", f"renamed {key}")
    if label_ids is not None and set(label_ids) != old_labels:
        log("issue_labels_changed", f"updated labels on {key}")


@router.patch("/bulk")
def bulk_update(payload: IssueBulkUpdate, db: Session = Depends(get_db)) -> dict:
    data = payload.model_dump(exclude_unset=True)
    data.pop("ids")
    if not data:
        raise HTTPException(status_code=422, detail="nothing to update")
    validate_status(data.get("status"))
    validate_priority(data.get("priority"))
    issues = db.query(Issue).filter(Issue.id.in_(payload.ids)).all()
    if len(issues) != len(set(payload.ids)):
        raise HTTPException(status_code=404, detail="one or more issues not found")
    for issue in issues:
        apply_changes(db, issue, data)
    db.commit()
    for issue in issues:
        db.refresh(issue)
    return {"items": [issue_out(i) for i in issues]}


@router.post("/bulk/delete")
def bulk_delete(payload: IssueBulkDelete, db: Session = Depends(get_db)) -> dict:
    issues = db.query(Issue).filter(Issue.id.in_(payload.ids)).all()
    for issue in issues:
        log_activity(db, "issue_deleted", f"deleted {issue.issue_key}", project_id=issue.project_id)
        db.delete(issue)
    db.commit()
    return {"deleted": len(issues)}


@router.get("/{issue_id}")
def get_issue(issue_id: UUID, db: Session = Depends(get_db)) -> dict:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")
    return issue_out(issue)


@router.patch("/{issue_id}")
def update_issue(issue_id: UUID, payload: IssueUpdate, db: Session = Depends(get_db)) -> dict:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        validate_status(data["status"])
    if "priority" in data:
        validate_priority(data["priority"])
    if "project_id" in data:
        raise HTTPException(status_code=400, detail="project_id cannot be changed")

    apply_changes(db, issue, data)
    db.commit()
    db.refresh(issue)
    return issue_out(issue)


@router.post("/{issue_id}/move")
def move_issue(issue_id: UUID, payload: IssueMove, db: Session = Depends(get_db)) -> dict:
    """Place an issue at `index` inside a column. Renumbers only that column."""
    validate_status(payload.status)
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")

    column = (
        db.query(Issue)
        .filter(
            Issue.project_id == issue.project_id,
            Issue.status == payload.status,
            Issue.id != issue.id,
        )
        .order_by(*COLUMN_ORDER)
        .all()
    )
    column.insert(min(payload.index, len(column)), issue)
    apply_changes(db, issue, {"status": payload.status})
    for i, item in enumerate(column):
        position = float(i * 1024)
        if item.position != position:
            item.position = position
    db.commit()
    db.refresh(issue)
    return issue_out(issue)


@router.delete("/{issue_id}", status_code=204)
def delete_issue(issue_id: UUID, db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")
    key = issue.issue_key
    log_activity(
        db,
        "issue_deleted",
        f"deleted {key}",
        project_id=issue.project_id,
    )
    db.delete(issue)
    db.commit()

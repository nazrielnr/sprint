"""Idempotent seed: python -m app.seed"""

import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import ActivityLog, Comment, Issue, IssueLabel, Label, Project, User, Workspace, WorkspaceMember

DEMO_USER = ("Demo User", "demo@example.com")

LABELS = [
    ("bug", "#ef4444"),
    ("feature", "#3b82f6"),
    ("docs", "#8b5cf6"),
    ("chore", "#6b7280"),
    ("design", "#ec4899"),
    ("infra", "#14b8a6"),
]

PROJECTS = [
    ("Website Redesign", "WEB", "Public marketing site revamp", "#6366f1"),
    ("Core API", "API", "Backend services and integrations", "#0ea5e9"),
    ("Analytics Dashboard", "DASH", "Internal reporting dashboard", "#f59e0b"),
]

ISSUES = [
    # (project, title, status, priority, due_offset_days|None, labels, description)
    ("WEB", "Design new landing page hero", "done", "high", -20, ["design"], "Hero section with new branding"),
    ("WEB", "Implement responsive nav bar", "done", "medium", -15, ["feature"], "Mobile-first hamburger nav"),
    ("WEB", "Fix broken favicon on Safari", "todo", "low", 3, ["bug"], "Favicon 404s on Safari 17"),
    ("WEB", "Migrate blog to new CMS", "in_progress", "medium", 5, ["feature"], "Move 40+ posts"),
    ("WEB", "Update pricing page copy", "backlog", "no_priority", None, ["docs"], "Rewrite tiers"),
    ("WEB", "Accessibility audit fixes", "todo", "urgent", -2, ["bug"], "WCAG contrast issues on CTA"),  # overdue
    ("API", "Set up project scaffolding", "done", "high", -30, ["infra"], "FastAPI + Alembic + CI"),
    ("API", "Implement issue CRUD endpoints", "in_progress", "urgent", -1, ["feature"], "POST/PATCH/DELETE issues"),  # overdue
    ("API", "Add pagination to list endpoints", "in_review", "medium", 2, ["feature"], "page/limit params"),
    ("API", "Rate limiting for public routes", "backlog", "low", None, ["infra"], "Token bucket"),
    ("API", "Fix timezone bug in due_date filter", "todo", "high", -4, ["bug"], "UTC off-by-one"),  # overdue
    ("DASH", "Build stats cards component", "in_progress", "high", 4, ["feature"], "Total/done/overdue cards"),
    ("DASH", "Design activity feed UI", "in_review", "medium", 6, ["design"], "Latest 20 events"),
    ("DASH", "Add export-to-CSV button", "backlog", "no_priority", None, [], "Per-project export"),
    ("DASH", "Fix chart tooltip flicker", "todo", "medium", -3, ["bug"], "Recharts hover jitter"),  # overdue
]

COMMENTS = [
    ("WEB-003", "Confirmed on Safari 17.2, investigating."),
    ("WEB-003", "Seems related to the .ico content-type header."),
    ("API-002", "Endpoints drafted, adding tests next."),
    ("API-003", "Please also cover the search parameter."),
    ("DASH-001", "Cards match the Figma spec now."),
]


def seed(db: Session) -> None:
    """Populate demo data. Idempotent: skips entirely if workspace slug exists."""
    if db.query(Workspace).filter(Workspace.slug == "sprint-demo").first():
        return

    ws = Workspace(name="Sprint Demo", slug="sprint-demo")
    db.add(ws)
    db.flush()

    user = User(name=DEMO_USER[0], email=DEMO_USER[1], avatar_url=None)
    db.add(user)
    db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="admin"))
    db.flush()

    labels: dict[str, Label] = {}
    for name, color in LABELS:
        lbl = Label(workspace_id=ws.id, name=name, color=color)
        db.add(lbl)
        labels[name] = lbl
    db.flush()

    projects: dict[str, Project] = {}
    for name, ident, desc, color in PROJECTS:
        p = Project(workspace_id=ws.id, name=name, identifier=ident, description=desc, color=color, status="active")
        db.add(p)
        db.flush()
        projects[ident] = p
        db.add(
            ActivityLog(
                workspace_id=ws.id,
                project_id=p.id,
                action="project_created",
                description=f"created project {ident} ({name})",
            )
        )

    issues: dict[str, Issue] = {}
    today = date.today()
    for ident, title, status, priority, due_off, issue_labels, desc in ISSUES:
        p = projects[ident]
        number = p.counter + 1
        p.counter = number
        key = f"{p.identifier}-{number:03d}"
        issue = Issue(
            project_id=p.id,
            issue_number=number,
            issue_key=key,
            title=title,
            description=desc,
            status=status,
            priority=priority,
            assignee_id=user.id if status in ("in_progress", "in_review") else None,
            due_date=(today + timedelta(days=due_off)) if due_off is not None else None,
        )
        db.add(issue)
        db.flush()
        for lbl_name in issue_labels:
            db.add(IssueLabel(issue_id=issue.id, label_id=labels[lbl_name].id))
        db.add(
            ActivityLog(
                workspace_id=ws.id,
                project_id=p.id,
                issue_id=issue.id,
                action="issue_created",
                description=f"created {key} in project {p.identifier}",
            )
        )
        issues[key] = issue

    # a couple of status/priority change activity rows
    db.add(
        ActivityLog(
            workspace_id=ws.id,
            project_id=issues["WEB-004"].project_id,
            issue_id=issues["WEB-004"].id,
            action="issue_status_changed",
            description="moved WEB-004 from todo to in_progress",
        )
    )
    db.add(
        ActivityLog(
            workspace_id=ws.id,
            project_id=issues["API-002"].project_id,
            issue_id=issues["API-002"].id,
            action="issue_priority_changed",
            description="changed priority of API-002 from high to urgent",
        )
    )

    for key, content in COMMENTS:
        issue = issues[key]
        db.add(Comment(issue_id=issue.id, author_id=user.id, content=content))
        db.add(
            ActivityLog(
                workspace_id=ws.id,
                project_id=issue.project_id,
                issue_id=issue.id,
                action="comment_created",
                description=f"commented on {key}",
            )
        )


def main() -> None:
    # run migrations first if the DB is fresh (best-effort convenience)
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=Path.cwd(), check=False)
    from app.core.db import SessionLocal

    with SessionLocal() as db:
        if db.query(Workspace).filter(Workspace.slug == "sprint-demo").first():
            print("seed: workspace 'sprint-demo' already exists — nothing to do")
            return
        seed(db)
        db.commit()
        print("seed: demo data created")


if __name__ == "__main__":
    main()

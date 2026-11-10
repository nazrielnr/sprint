import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid


class Base(DeclarativeBase):
    pass


def gen_uuid() -> uuid.UUID:
    return uuid.uuid4()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)

    projects: Mapped[list["Project"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    users: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    assigned_issues: Mapped[list["Issue"]] = relationship(back_populates="assignee")


class WorkspaceMember(TimestampMixin, Base):
    __tablename__ = "workspace_members"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="member")

    workspace: Mapped[Workspace] = relationship(back_populates="users")
    user: Mapped[User] = relationship(back_populates="memberships")

    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    identifier: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    counter: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    workspace: Mapped[Workspace] = relationship(back_populates="projects")
    issues: Mapped[list["Issue"]] = relationship(back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("workspace_id", "identifier", name="uq_project_workspace_identifier"),
        Index("ix_projects_workspace_id", "workspace_id"),
    )


class Issue(TimestampMixin, Base):
    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    issue_number: Mapped[int] = mapped_column(Integer, nullable=False)
    issue_key: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="backlog")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="no_priority")
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Manual order inside a (project, status) column. Equal values fall back to priority order.
    position: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")

    project: Mapped[Project] = relationship(back_populates="issues")
    assignee: Mapped[User | None] = relationship(back_populates="assigned_issues")
    comments: Mapped[list["Comment"]] = relationship(back_populates="issue", cascade="all, delete-orphan")
    labels: Mapped[list["IssueLabel"]] = relationship(back_populates="issue", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("project_id", "issue_number", name="uq_issue_project_number"),
        Index("ix_issues_project_id", "project_id"),
        Index("ix_issues_status", "status"),
        Index("ix_issues_assignee_id", "assignee_id"),
        Index("ix_issues_due_date", "due_date"),
    )


class Comment(TimestampMixin, Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    issue_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    issue: Mapped[Issue] = relationship(back_populates="comments")
    author: Mapped[User | None] = relationship()

    __table_args__ = (Index("ix_comments_issue_id", "issue_id"),)


class Label(TimestampMixin, Base):
    __tablename__ = "labels"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    issues: Mapped[list["IssueLabel"]] = relationship(back_populates="label", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_label_workspace_name"),
        Index("ix_labels_workspace_id", "workspace_id"),
    )


class IssueLabel(Base):
    __tablename__ = "issue_labels"

    issue_id: Mapped[uuid.UUID] = mapped_column(Uuid(), ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True)
    label_id: Mapped[uuid.UUID] = mapped_column(Uuid(), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)

    issue: Mapped[Issue] = relationship(back_populates="labels")
    label: Mapped[Label] = relationship(back_populates="issues")

    __table_args__ = (Index("ix_issue_labels_label_id", "label_id"),)


class ActivityLog(TimestampMixin, Base):
    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=gen_uuid)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    issue_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("ix_activity_project_id", "project_id"),
        Index("ix_activity_issue_id", "issue_id"),
        Index("ix_activity_created_at", "created_at"),
    )


__all__ = [
    "Base",
    "Workspace",
    "User",
    "WorkspaceMember",
    "Project",
    "Issue",
    "Comment",
    "Label",
    "IssueLabel",
    "ActivityLog",
]
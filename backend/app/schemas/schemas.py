from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ISSUE_STATUSES = ("backlog", "todo", "in_progress", "in_review", "done", "canceled")
ISSUE_PRIORITIES = ("urgent", "high", "medium", "low", "no_priority")
PROJECT_STATUSES = ("active", "archived")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ---- Projects ----
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    identifier: str = Field(min_length=1, max_length=20)
    description: str | None = None
    color: str | None = None
    status: str = "active"


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    color: str | None = None
    status: str | None = None


class ProjectOut(ORMModel):
    id: UUID
    name: str
    identifier: str
    description: str | None
    color: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectWithCounts(ProjectOut):
    issue_count: int
    done_count: int


# ---- Users ----
class UserOut(ORMModel):
    id: UUID
    name: str
    email: str
    avatar_url: str | None


class UserList(BaseModel):
    items: list[UserOut]


# ---- Labels ----
class LabelOut(ORMModel):
    id: UUID
    name: str
    color: str | None


class LabelList(BaseModel):
    items: list[LabelOut]


# ---- Issues ----
class IssueCreate(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: str = "backlog"
    priority: str = "no_priority"
    assignee_id: UUID | None = None
    due_date: date | None = None
    label_ids: list[UUID] = Field(default_factory=list)


class IssueUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_id: UUID | None = None
    due_date: date | None = None
    label_ids: list[UUID] | None = None


class IssueMove(BaseModel):
    """Drop an issue into a board column at a given index."""

    status: str
    index: int = Field(ge=0)


class IssueBulkUpdate(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=200)
    status: str | None = None
    priority: str | None = None
    assignee_id: UUID | None = None
    label_ids: list[UUID] | None = None


class IssueBulkDelete(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=200)


class IssueOut(ORMModel):
    id: UUID
    issue_key: str
    project_id: UUID
    title: str
    description: str | None
    status: str
    priority: str
    assignee_id: UUID | None
    due_date: date | None
    label_ids: list[UUID] = Field(default_factory=list)
    position: float = 0.0
    created_at: datetime
    updated_at: datetime


class IssueList(BaseModel):
    items: list[IssueOut]
    total: int
    page: int
    limit: int


# ---- Comments ----
class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    author_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentOut(ORMModel):
    id: UUID
    issue_id: UUID
    author_id: UUID | None
    content: str
    created_at: datetime
    updated_at: datetime


class CommentList(BaseModel):
    items: list[CommentOut]


# ---- Activity ----
class ActivityOut(ORMModel):
    id: UUID
    project_id: UUID | None
    issue_id: UUID | None
    action: str
    description: str
    created_at: datetime


class ActivityList(BaseModel):
    items: list[ActivityOut]


# ---- Dashboard ----
class DashboardStats(BaseModel):
    total_projects: int
    total_issues: int
    in_progress: int
    completed: int
    overdue: int
    open: int = 0

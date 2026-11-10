from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Project, Workspace
from app.schemas import ISSUE_STATUSES, PROJECT_STATUSES, ProjectCreate, ProjectOut, ProjectUpdate
from app.services.activity import log as log_activity

router = APIRouter(prefix="/projects", tags=["projects"])


def get_first_workspace(db: Session) -> Workspace:
    ws = db.query(Workspace).first()
    if ws is None:
        raise HTTPException(status_code=404, detail="no workspace found; run seed first")
    return ws


@router.get("")
def list_projects(db: Session = Depends(get_db)) -> dict:
    ws = get_first_workspace(db)
    projects = db.query(Project).filter(Project.workspace_id == ws.id).order_by(Project.created_at).all()
    return {"items": [ProjectOut.model_validate(p).model_dump() for p in projects]}


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectOut:
    ws = get_first_workspace(db)
    ident = payload.identifier.strip()
    dup = (
        db.query(Project)
        .filter(Project.workspace_id == ws.id, Project.identifier == ident)
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail=f"project identifier '{ident}' already exists")
    if payload.status not in PROJECT_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {list(PROJECT_STATUSES)}")
    project = Project(
        workspace_id=ws.id,
        name=payload.name,
        identifier=ident,
        description=payload.description,
        color=payload.color,
        status=payload.status,
    )
    db.add(project)
    db.flush()
    log_activity(db, "project_created", f"created project {ident} ({project.name})", project_id=project.id)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/{project_id}")
def get_project(project_id: UUID, db: Session = Depends(get_db)) -> ProjectOut:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="project not found")
    return ProjectOut.model_validate(project)


@router.patch("/{project_id}")
def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_db)) -> ProjectOut:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="project not found")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in PROJECT_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {list(PROJECT_STATUSES)}")
    if "identifier" in data:
        raise HTTPException(status_code=400, detail="identifier cannot be changed")
    for field, value in data.items():
        setattr(project, field, value)
    if project.status == "archived":
        log_activity(db, "project_archived", f"archived project {project.identifier}", project_id=project.id)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="project not found")
    db.delete(project)
    db.commit()

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Comment, Issue
from app.schemas import CommentCreate, CommentList, CommentOut, CommentUpdate
from app.services.activity import log as log_activity

router = APIRouter(tags=["comments"])


@router.get("/issues/{issue_id}/comments")
def list_comments(issue_id: UUID, db: Session = Depends(get_db)) -> dict:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")
    comments = (
        db.query(Comment)
        .filter(Comment.issue_id == issue_id)
        .order_by(Comment.created_at, Comment.id)
        .all()
    )
    return {"items": [CommentOut.model_validate(c).model_dump() for c in comments]}


@router.post("/issues/{issue_id}/comments", status_code=201)
def create_comment(issue_id: UUID, payload: CommentCreate, db: Session = Depends(get_db)) -> CommentOut:
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="issue not found")
    comment = Comment(issue_id=issue_id, author_id=payload.author_id, content=payload.content)
    db.add(comment)
    db.flush()
    log_activity(
        db,
        "comment_created",
        f"commented on {issue.issue_key}",
        project_id=issue.project_id,
        issue_id=issue.id,
    )
    db.commit()
    db.refresh(comment)
    return CommentOut.model_validate(comment)


@router.patch("/comments/{comment_id}")
def update_comment(comment_id: UUID, payload: CommentUpdate, db: Session = Depends(get_db)) -> CommentOut:
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="comment not found")
    comment.content = payload.content
    db.commit()
    db.refresh(comment)
    return CommentOut.model_validate(comment)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: UUID, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="comment not found")
    db.delete(comment)
    db.commit()

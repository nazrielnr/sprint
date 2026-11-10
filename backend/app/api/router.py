from fastapi import APIRouter

from app.api import activity, comments, dashboard, health, issues, meta, projects

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(projects.router)
api_router.include_router(issues.router)
api_router.include_router(comments.router)
api_router.include_router(dashboard.router)
api_router.include_router(activity.router)
api_router.include_router(meta.router)

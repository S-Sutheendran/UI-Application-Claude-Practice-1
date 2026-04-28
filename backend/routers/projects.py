from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from database import get_db
from models.project import Project
from models.task import Task
from models.user import User
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from core.dependencies import get_current_user
from core.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.user_id == user.id).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    # Annotate with task counts
    out = []
    for p in projects:
        tc = await db.execute(select(func.count(Task.id)).where(Task.project_id == p.id))
        cc = await db.execute(select(func.count(Task.id)).where(Task.project_id == p.id, Task.completed == True))
        r = ProjectResponse.model_validate(p)
        r.task_count = tc.scalar() or 0
        r.completed_count = cc.scalar() or 0
        out.append(r)
    return out


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(body: ProjectCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    proj = Project(id=str(uuid.uuid4()), user_id=user.id, name=body.name, color=body.color, icon=body.icon)
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise NotFoundError("Project", project_id)
    if proj.user_id != user.id:
        raise ForbiddenError()
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(proj, field, value)
    await db.commit()
    await db.refresh(proj)
    return proj


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    proj = result.scalar_one_or_none()
    if not proj:
        raise NotFoundError("Project", project_id)
    if proj.user_id != user.id:
        raise ForbiddenError()
    await db.delete(proj)
    await db.commit()

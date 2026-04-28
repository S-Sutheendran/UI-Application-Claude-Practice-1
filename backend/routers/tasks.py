from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, date
from typing import Optional
import uuid
from database import get_db
from models.task import Task, Subtask
from models.user import User
from schemas.task import TaskCreate, TaskUpdate, TaskResponse, SubtaskCreate, SubtaskResponse, TaskToggleResponse
from core.dependencies import get_current_user
from core.exceptions import NotFoundError, ForbiddenError
from services.productivity_service import update_daily_stats, advance_recurring_task

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _assert_owns(task: Task, user: User):
    if task.user_id != user.id:
        raise ForbiddenError()


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    completed: Optional[bool] = None,
    priority: Optional[str] = None,
    project_id: Optional[str] = None,
    due_before: Optional[date] = None,
    due_after: Optional[date] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Task).where(Task.user_id == user.id)
    if completed is not None:
        q = q.where(Task.completed == completed)
    if priority:
        q = q.where(Task.priority == priority)
    if project_id:
        q = q.where(Task.project_id == project_id)
    if due_before:
        q = q.where(Task.due_date <= datetime.combine(due_before, datetime.max.time()))
    if due_after:
        q = q.where(Task.due_date >= datetime.combine(due_after, datetime.min.time()))
    if search:
        q = q.where(Task.title.ilike(f"%{search}%"))
    q = q.order_by(Task.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    tasks = result.scalars().all()
    # Filter by tag in Python (JSON column)
    if tag:
        tasks = [t for t in tasks if tag.lower() in (t.tags or [])]
    return tasks


@router.get("/overdue", response_model=list[TaskResponse])
async def overdue_tasks(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.completed == False,
            Task.due_date < now,
        ).order_by(Task.due_date.asc())
    )
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    _assert_owns(task, user)
    return task


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(body: TaskCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    task = Task(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        project_id=body.project_id,
        tags=body.tags,
        due_date=body.due_date,
        reminder_time=body.reminder_time,
        estimated_pomodoros=body.estimated_pomodoros,
        recurring=body.recurring.model_dump() if body.recurring else None,
    )
    db.add(task)
    await db.flush()

    for i, st in enumerate(body.subtasks):
        db.add(Subtask(id=str(uuid.uuid4()), task_id=task.id, title=st.title, done=st.done, position=i))

    await db.commit()
    await db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    _assert_owns(task, user)

    for field, value in body.model_dump(exclude_none=True).items():
        if field == "recurring":
            setattr(task, field, value.model_dump() if value else None)
        else:
            setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}/toggle", response_model=TaskToggleResponse)
async def toggle_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    _assert_owns(task, user)

    task.completed = not task.completed
    task.completed_at = datetime.utcnow() if task.completed else None

    next_task = None
    if task.completed:
        await update_daily_stats(user.id, db, tasks_completed=1)
        if task.recurring:
            next_task = await advance_recurring_task(task, db)

    await db.commit()
    await db.refresh(task)
    if next_task:
        await db.refresh(next_task)

    return TaskToggleResponse(completed=task, next=next_task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    _assert_owns(task, user)
    await db.delete(task)
    await db.commit()


@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
async def add_subtask(
    task_id: str,
    body: SubtaskCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("Task", task_id)
    _assert_owns(task, user)
    st = Subtask(id=str(uuid.uuid4()), task_id=task_id, title=body.title, done=body.done, position=body.position)
    db.add(st)
    await db.commit()
    await db.refresh(st)
    return st


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    task_id: str,
    subtask_id: str,
    body: SubtaskCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subtask).join(Task, Subtask.task_id == Task.id)
        .where(Subtask.id == subtask_id, Task.user_id == user.id)
    )
    st = result.scalar_one_or_none()
    if not st:
        raise NotFoundError("Subtask", subtask_id)
    st.title = body.title
    st.done = body.done
    st.position = body.position
    await db.commit()
    await db.refresh(st)
    return st


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subtask).join(Task, Subtask.task_id == Task.id)
        .where(Subtask.id == subtask_id, Task.user_id == user.id)
    )
    st = result.scalar_one_or_none()
    if not st:
        raise NotFoundError("Subtask", subtask_id)
    await db.delete(st)
    await db.commit()

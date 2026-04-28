from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import Optional
import uuid
from database import get_db
from models.user import User
from models.chat import ChatMessage
from schemas.chat import ChatMessageCreate, ChatMessageResponse
from core.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

MAX_MESSAGES_PER_CHANNEL = 500
TRIM_TO = 400


async def _trim_channel(user_id: str, channel_id: str, db: AsyncSession):
    """Delete oldest messages when channel exceeds limit."""
    count_result = await db.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.user_id == user_id,
            ChatMessage.channel_id == channel_id,
        )
    )
    count = count_result.scalar() or 0
    if count >= MAX_MESSAGES_PER_CHANNEL:
        # Find the timestamp cutoff: keep only the newest TRIM_TO messages
        cutoff_q = (
            select(ChatMessage.timestamp)
            .where(ChatMessage.user_id == user_id, ChatMessage.channel_id == channel_id)
            .order_by(ChatMessage.timestamp.desc())
            .offset(TRIM_TO)
            .limit(1)
        )
        cutoff_row = (await db.execute(cutoff_q)).first()
        if cutoff_row:
            await db.execute(
                delete(ChatMessage).where(
                    ChatMessage.user_id == user_id,
                    ChatMessage.channel_id == channel_id,
                    ChatMessage.timestamp <= cutoff_row[0],
                )
            )


@router.get("/{channel_id}", response_model=list[ChatMessageResponse])
async def get_history(
    channel_id: str,
    limit: int = Query(100, le=500),
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id, ChatMessage.channel_id == channel_id)
        .order_by(ChatMessage.timestamp.asc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.post("/{channel_id}", response_model=ChatMessageResponse, status_code=201)
async def post_message(
    channel_id: str,
    body: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _trim_channel(user.id, channel_id, db)

    msg = ChatMessage(
        id=str(uuid.uuid4()),
        user_id=user.id,
        channel_id=channel_id,
        role=body.role,
        content=body.content,
        suggested_tasks=body.suggested_tasks,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


@router.delete("/{channel_id}", status_code=204)
async def clear_channel(
    channel_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(ChatMessage).where(
            ChatMessage.user_id == user.id,
            ChatMessage.channel_id == channel_id,
        )
    )
    await db.commit()

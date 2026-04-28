from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class ChatMessageCreate(BaseModel):
    content: str
    channel_id: str = "ai"
    role: str = "user"
    suggested_tasks: Optional[list] = None


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    role: str
    content: str
    channel_id: str
    suggested_tasks: Optional[list]
    timestamp: datetime

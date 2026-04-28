from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    color: str = "#7C3AED"
    icon: str = "📁"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    name: str
    color: str
    icon: str
    created_at: datetime
    updated_at: datetime
    task_count: int = 0
    completed_count: int = 0

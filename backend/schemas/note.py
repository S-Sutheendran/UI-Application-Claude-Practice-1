from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, List


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    color: str = "#1E1B4B"
    tags: List[str] = []
    pinned: bool = False

    @field_validator("tags")
    @classmethod
    def tags_clean(cls, v):
        return list(dict.fromkeys(t.lower().strip() for t in v if t.strip()))


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    content: str
    color: str
    tags: list
    pinned: bool
    created_at: datetime
    updated_at: datetime

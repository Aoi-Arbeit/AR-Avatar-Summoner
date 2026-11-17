from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# --- キャラクター関連スキーマ ---

class PartsConfig(BaseModel):
    face: int
    body: int
    hair: int
    accessories: List[int] = Field(default_factory=list)
    hair_color: Optional[str] = None
    scale: Optional[float] = 1.0


class AgentPersona(BaseModel):
    character_name: Optional[str] = None
    personality: Optional[str] = None
    first_person: Optional[str] = None
    speaking_style: Optional[str] = None


class CharacterCreate(BaseModel):
    name: Optional[str] = "NoName"
    parts_config: PartsConfig
    agent_persona: Optional[AgentPersona] = None


class CharacterResponse(BaseModel):
    character_id: str
    name: str
    access_code: str
    qr_payload: str
    created_at: datetime

    class Config:
        from_attributes = True


class CharacterAuthRequest(BaseModel):
    character_id: str
    access_code: str


class CharacterAuthResponse(BaseModel):
    token: str
    character: dict


# --- AI Agent関連スキーマ ---

class GeneratePresetRequest(BaseModel):
    instruction: str = Field(..., description="自然言語でのキャラ作成指示")


class GeneratePresetResponse(BaseModel):
    parts_config: PartsConfig
    persona: AgentPersona


class InteractRequest(BaseModel):
    character_id: str
    user_message: str
    scene_description: Optional[str] = "室内のデスクの上"


class AgentActionResponse(BaseModel):
    reply_text: str = Field(..., description="キャラクターのセリフ（50文字以内）")
    animation_clip: Literal["idle", "walk", "jump", "wave", "cheer", "think"] = Field(
        ..., description="再生する3Dアニメーション名"
    )
    expression: Literal["neutral", "happy", "surprised", "sleepy"] = Field(
        ..., description="顔の表情（ブレンドシェイプ）"
    )

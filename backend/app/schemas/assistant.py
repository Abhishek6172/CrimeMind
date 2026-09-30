from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AssistantChatRequest(BaseModel):
    message: str
    case_id: Optional[str] = None
    conversation_id: Optional[str] = None
    stream: bool = True
    context_filters: Optional[Dict[str, Any]] = None


class AssistantChatResponse(BaseModel):
    conversation_id: str
    message: str
    active_agent: str
    sources: List[str] = []
    agent_trace: List[Dict[str, Any]] = []
    timestamp: datetime


class AssistantStreamEvent(BaseModel):
    event_type: str  # agent_started, agent_progress, agent_result, token, final_synthesis
    agent_name: Optional[str] = None
    token: Optional[str] = None
    progress_percentage: Optional[int] = None
    data: Optional[Dict[str, Any]] = None


class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = None
    sample_rate: Optional[int] = 16000
    language: Optional[str] = "en"


class TranscribeResponse(BaseModel):
    transcript: str
    confidence: float
    duration_seconds: float


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = "tactical_operator"
    speed: Optional[float] = 1.0


class SpeakResponse(BaseModel):
    audio_base64: str
    format: str = "audio/mp3"
    duration_seconds: float

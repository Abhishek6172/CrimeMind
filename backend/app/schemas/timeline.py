from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class TimelineEventResponse(BaseModel):
    id: str
    case_id: Optional[UUID] = None
    timestamp: datetime
    event_type: str  # crime, evidence, cctv, call, transaction, statement, location, agent_finding
    title: str
    description: str
    source: str
    location_name: Optional[str] = None
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    confidence: Optional[float] = 1.0
    is_ai_inferred: bool = False
    evidence_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class TimelineResponse(BaseModel):
    case_id: UUID
    case_number: Optional[str] = None
    total_events: int
    events: List[TimelineEventResponse]

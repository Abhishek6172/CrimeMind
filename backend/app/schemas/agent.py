from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AgentStatusResponse(BaseModel):
    id: str
    name: str
    status: str  # active, idle, standby, error
    current_task: Optional[str] = None
    last_execution: datetime
    execution_time_ms: int
    findings_count: int
    confidence: float
    errors: List[str] = []
    description: Optional[str] = None


class AgentTriggerRequest(BaseModel):
    agent_id: str
    case_id: Optional[UUID] = None
    parameters: Optional[Dict[str, Any]] = None


class AgentTriggerResponse(BaseModel):
    success: bool
    agent_id: str
    run_id: UUID
    status: str
    started_at: datetime
    message: str

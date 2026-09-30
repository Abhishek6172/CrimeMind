from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AlertItemResponse(BaseModel):
    id: str
    title: str
    type: str  # suspicious_activity, new_cctv_detection, evidence_match, cross_case_connection, unusual_transaction, repeated_vehicle_appearance, agent_generated_alert
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    timestamp: datetime
    description: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    status: str = "new"  # new, acknowledged, resolved
    source_evidence: Optional[Dict[str, Any]] = None  # MUST show source evidence per requirement!


class AlertUpdate(BaseModel):
    status: str  # acknowledged, resolved

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    case_number: str
    title: str
    description: str
    status: str = "open"
    priority: str = "medium"
    crime_type: str


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str
    status: str = "open"
    priority: str = "medium"
    crime_type: str
    investigating_officer_id: Optional[UUID] = None
    lead_analyst_id: Optional[UUID] = None
    primary_location_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    crime_type: Optional[str] = None
    lead_analyst_id: Optional[UUID] = None
    primary_location_id: Optional[UUID] = None
    closed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class CaseResponse(BaseModel):
    case_id: UUID
    case_number: str
    title: str
    description: str
    status: str
    priority: str
    crime_type: str
    investigating_officer_id: UUID
    lead_analyst_id: Optional[UUID] = None
    primary_location_id: Optional[UUID] = None
    opened_at: datetime
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaseDetailResponse(CaseResponse):
    persons_count: int = 0
    evidence_count: int = 0
    cctv_detections_count: int = 0
    ai_findings_count: int = 0
    persons: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []
    ai_findings: List[Dict[str, Any]] = []

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ChainOfCustodyEntry(BaseModel):
    timestamp: datetime
    officer_name: str
    badge_number: Optional[str] = None
    action: str
    location: str


class EvidenceBase(BaseModel):
    case_id: UUID
    incident_id: Optional[UUID] = None
    evidence_type: str
    title: str
    description: str
    source: str


class EvidenceCreate(EvidenceBase):
    evidence_number: Optional[str] = None
    file_path: Optional[str] = "vault/pending_upload.dat"
    hash: Optional[str] = "0000000000000000000000000000000000000000000000000000000000000000"
    metadata: Optional[Dict[str, Any]] = None
    chain_of_custody: Optional[List[Dict[str, Any]]] = None


class EvidenceResponse(BaseModel):
    evidence_id: UUID
    case_id: UUID
    incident_id: Optional[UUID] = None
    evidence_number: str
    evidence_type: str
    title: str
    description: str
    source: str
    collected_at: datetime
    collected_by: Optional[UUID] = None
    file_path: str
    hash: str
    chain_of_custody: List[Dict[str, Any]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class EvidenceUploadResponse(BaseModel):
    evidence_id: UUID
    evidence_number: str
    title: str
    file_path: str
    file_size_bytes: int
    sha256_hash: str
    evidence_type: str
    ai_status: str
    ai_confidence: float
    initial_findings: List[str] = []

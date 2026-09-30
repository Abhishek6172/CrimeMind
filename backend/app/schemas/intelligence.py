from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class CrossCaseIntelligenceResponse(BaseModel):
    person_id: UUID
    full_name: str
    aliases: List[str]
    risk_level: str
    cases: List[Dict[str, Any]]
    people: List[Dict[str, Any]]  # known associates across all cases
    vehicles: List[Dict[str, Any]]
    locations: List[Dict[str, Any]]
    calls: List[Dict[str, Any]]
    transactions: List[Dict[str, Any]]
    cctv: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    ai_findings: List[Dict[str, Any]]
    cross_case_match_count: int

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class PathObservation(BaseModel):
    id: str
    source_type: str  # cctv_detection, transaction_location, call_location, incident_location, vehicle_detection, person_observation
    location_id: Optional[str] = None
    location_name: str
    latitude: float
    longitude: float
    timestamp: datetime
    confidence: float
    evidence_id: Optional[str] = None
    verification_status: str  # Observed, Requires verification


class PathTransition(BaseModel):
    from_observation_id: str
    to_observation_id: str
    from_location: str
    to_location: str
    time_gap_seconds: int
    distance_meters: float
    implied_speed_kmh: float
    transition_feasibility: str  # highly_feasible, plausible, suspicious_warp
    status: str  # Potential connection, AI-inferred


class PathAnalysisResponse(BaseModel):
    target_id: str
    target_name: str
    target_type: str  # person, vehicle
    observations: List[PathObservation]
    possible_paths: List[PathTransition]
    overall_confidence: float
    status: str = "AI_INFERENCE_REQUIRES_VERIFICATION"
    supporting_evidence: List[Dict[str, Any]] = []
    disclaimer: str = "Legal Safeguard: Inferred movement paths are algorithmic hypotheses based on temporal observations and must NOT be recorded as established fact."

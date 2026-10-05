from typing import List, Dict, Any
from pydantic import BaseModel


class CrimeCategoryMetric(BaseModel):
    category: str
    count: int
    percentage: float
    severity_breakdown: Dict[str, int]


class CrimeTrendsMetric(BaseModel):
    period: str
    incidents_count: int
    cases_opened: int
    clearance_rate: float


class LocationHotspotMetric(BaseModel):
    location_id: str
    location_name: str
    area: str
    incident_count: int
    latitude: float
    longitude: float
    risk_level: str


class PersonConnectionMetric(BaseModel):
    person_id: str
    full_name: str
    degree_centrality: int
    direct_associates_count: int
    linked_cases_count: int
    risk_level: str


class VehicleAppearanceMetric(BaseModel):
    registration_number: str
    make: str
    model: str
    detection_count: int
    distinct_cameras_count: int
    is_stolen: bool
    owner_name: str

class DashboardStats(BaseModel):
    active_cases: int
    high_priority_cases: int
    evidence_processed: int
    cctv_detections: int
    active_ai_agents: int
    hypotheses_synthesized: int


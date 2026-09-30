from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class CCTVCameraResponse(BaseModel):
    camera_id: UUID
    location_id: UUID
    camera_name: str
    camera_code: str
    source: str
    resolution: str
    field_of_view: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CCTVDetectionResponse(BaseModel):
    detection_id: UUID
    camera_id: UUID
    detected_at: datetime
    person_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    detected_object: str
    confidence: float
    image_reference: str
    video_reference: Optional[str] = None
    bounding_box: Dict[str, float]
    camera_name: Optional[str] = None
    location_name: Optional[str] = None
    source: Optional[str] = "municipal_surveillance"
    verification_status: str = "REQUIRES_VERIFICATION"

    class Config:
        from_attributes = True


class CCTVDetectionCreate(BaseModel):
    camera_id: UUID
    person_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    detected_object: str
    confidence: float
    image_reference: str
    video_reference: Optional[str] = None
    bounding_box: Optional[Dict[str, float]] = None


class CCTVMatchRequest(BaseModel):
    target_type: str = "person"  # person or vehicle
    reference_name: str
    min_confidence: float = 0.70


class CCTVMatchResult(BaseModel):
    detection_id: UUID
    camera_id: UUID
    camera_name: str
    location_name: str
    timestamp: datetime
    detected_object: str
    match_confidence: float
    source: str
    image_reference: str
    verification_status: str = "ALGORITHMIC_MATCH_REQUIRES_VERIFICATION"

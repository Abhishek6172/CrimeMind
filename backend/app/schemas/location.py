from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class LocationBase(BaseModel):
    name: str
    address: str
    city: str
    area: str
    postal_code: Optional[str] = None
    latitude: Decimal
    longitude: Decimal
    location_type: str
    risk_level: str = "low"


class LocationCreate(LocationBase):
    risk_metadata: Optional[Dict[str, Any]] = None


class LocationResponse(BaseModel):
    location_id: UUID
    name: str
    address: str
    city: str
    area: str
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    location_type: str
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True

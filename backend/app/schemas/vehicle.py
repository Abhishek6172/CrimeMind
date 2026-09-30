from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class VehicleBase(BaseModel):
    registration_number: str
    vin: str
    vehicle_type: str
    make: str
    model: str
    year: Optional[int] = None
    color: str
    owner_person_id: Optional[UUID] = None
    stolen_status: bool = False
    notes: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(BaseModel):
    vehicle_id: UUID
    registration_number: str
    vin: str
    vehicle_type: str
    make: str
    model: str
    year: Optional[int] = None
    color: str
    owner_person_id: Optional[UUID] = None
    stolen_status: bool
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

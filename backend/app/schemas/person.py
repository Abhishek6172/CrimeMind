from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field


class PersonBase(BaseModel):
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    aliases: List[str] = []
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    national_id_synthetic: Optional[str] = None
    occupation: Optional[str] = None
    description: Optional[str] = None
    risk_level: str = "low"
    phone_numbers: List[str] = []
    email_addresses: List[str] = []


class PersonCreate(PersonBase):
    first_name: str
    last_name: str
    notes: Optional[str] = None


class PersonUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    aliases: Optional[List[str]] = None
    occupation: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[str] = None
    notes: Optional[str] = None
    phone_numbers: Optional[List[str]] = None
    email_addresses: Optional[List[str]] = None


class PersonResponse(BaseModel):
    person_id: UUID
    first_name: str
    last_name: str
    full_name: str
    aliases: List[str] = []
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    national_id_synthetic: str
    occupation: Optional[str] = None
    description: Optional[str] = None
    risk_level: str
    phone_numbers: List[str] = []
    email_addresses: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonDetailResponse(PersonResponse):
    linked_cases: List[Dict[str, Any]] = []
    known_associates: List[Dict[str, Any]] = []
    vehicles: List[Dict[str, Any]] = []
    recent_observations: List[Dict[str, Any]] = []
    recent_cctv_detections: List[Dict[str, Any]] = []
    recent_calls: List[Dict[str, Any]] = []
    recent_transactions: List[Dict[str, Any]] = []
    ai_findings: List[Dict[str, Any]] = []

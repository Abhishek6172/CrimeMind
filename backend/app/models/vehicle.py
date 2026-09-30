import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from app.database.base import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_number = Column(String(32), nullable=False, unique=True, index=True)
    vin = Column(String(32), nullable=False, unique=True, index=True)
    vehicle_type = Column(String(32), nullable=False)
    make = Column(String(64), nullable=False, index=True)
    model = Column(String(64), nullable=False)
    year = Column(Integer, nullable=True)
    color = Column(String(32), nullable=False)
    owner_person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    stolen_status = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

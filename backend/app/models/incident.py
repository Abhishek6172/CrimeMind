import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from app.database.base import Base


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=True, index=True)
    incident_number = Column(String(64), nullable=False, unique=True, index=True)
    crime_type = Column(String(64), nullable=False)
    severity = Column(String(20), nullable=False, default="moderate")
    status = Column(String(32), nullable=False, default="reported")
    occurred_at = Column(DateTime(timezone=True), nullable=False, index=True)
    reported_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True, index=True)
    description = Column(Text, nullable=False)
    modus_operandi = Column(Text, nullable=True)
    estimated_loss_amount = Column(Numeric(14, 2), nullable=True, default=0.00)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False, index=True)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.incident_id"), nullable=True, index=True)
    evidence_number = Column(String(64), nullable=False, unique=True, index=True)
    evidence_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source = Column(String(128), nullable=False)
    collected_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    collected_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    file_path = Column(Text, nullable=False)
    hash = Column(String(64), nullable=False)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    chain_of_custody = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="evidence")

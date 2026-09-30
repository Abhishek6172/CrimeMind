import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(64), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="open")
    priority = Column(String(20), nullable=False, default="medium")
    crime_type = Column(String(64), nullable=False)
    investigating_officer_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    lead_analyst_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    primary_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case_persons = relationship("CasePerson", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")


class CasePerson(Base):
    __tablename__ = "case_persons"

    case_person_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=False, index=True)
    relationship_type = Column(String(32), nullable=False)
    involvement_summary = Column(Text, nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    added_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("case_id", "person_id", "relationship_type", name="uq_case_person_role"),
    )

    # Relationships
    case = relationship("Case", back_populates="case_persons")
    person = relationship("Person", back_populates="case_persons")

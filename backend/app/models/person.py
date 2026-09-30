import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Integer, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class Person(Base):
    __tablename__ = "persons"

    person_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False, index=True)
    aliases = Column(JSON, nullable=False, default=list)
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    national_id_synthetic = Column(String(64), nullable=False, unique=True, index=True)
    occupation = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    physical_characteristics = Column(JSON, nullable=False, default=dict)
    phone_numbers = Column(JSON, nullable=False, default=list)
    email_addresses = Column(JSON, nullable=False, default=list)
    addresses = Column(JSON, nullable=False, default=list)
    risk_level = Column(String(20), nullable=False, default="low")
    risk_indicators = Column(JSON, nullable=False, default=list)
    notes = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    case_persons = relationship("CasePerson", back_populates="person")
    observations = relationship("PersonLocation", back_populates="person")


class PersonLocation(Base):
    __tablename__ = "person_locations"

    observation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=False, index=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=False, index=True)
    observed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(64), nullable=False)
    confidence = Column(Numeric(5, 4), nullable=False, default=1.0000)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    person = relationship("Person", back_populates="observations")

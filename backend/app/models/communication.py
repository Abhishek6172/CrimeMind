import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from app.database.base import Base


class Statement(Base):
    __tablename__ = "statements"

    statement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    statement_text = Column(Text, nullable=False)
    statement_timestamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    investigator_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    source = Column(String(64), nullable=False)
    transcript_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CallRecord(Base):
    __tablename__ = "call_records"

    call_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    caller_phone = Column(String(32), nullable=False, index=True)
    caller_person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    receiver_phone = Column(String(32), nullable=False, index=True)
    receiver_person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    call_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=False, default=0)
    call_type = Column(String(32), nullable=False, default="voice")
    originating_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True)
    destination_location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True)
    tower_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    receiver_person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    sender_account = Column(String(64), nullable=False)
    receiver_account = Column(String(64), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    transaction_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)
    merchant = Column(String(128), nullable=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True)
    is_flagged_suspicious = Column(Boolean, nullable=False, default=False, index=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

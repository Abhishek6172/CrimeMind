import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from app.database.base import Base


class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=True, index=True)
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    primary_entity_type = Column(String(32), nullable=True)
    primary_entity_id = Column(UUID(as_uuid=True), nullable=True)
    secondary_entity_type = Column(String(32), nullable=True)
    secondary_entity_id = Column(UUID(as_uuid=True), nullable=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=True)
    description = Column(Text, nullable=False)
    source = Column(String(128), nullable=False)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    run_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=True, index=True)
    agent_name = Column(String(128), nullable=False, index=True)
    task = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="pending", index=True)
    started_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    input_parameters = Column(JSON, nullable=False, default=dict)
    output_summary = Column(JSON, nullable=False, default=dict)
    confidence = Column(Numeric(5, 4), nullable=True)
    errors = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class AIFinding(Base):
    __tablename__ = "ai_findings"

    finding_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False, index=True)
    agent_run_id = Column(UUID(as_uuid=True), ForeignKey("agent_runs.run_id"), nullable=True)
    agent_name = Column(String(128), nullable=False)
    finding_type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    finding_text = Column(Text, nullable=False)
    confidence = Column(Numeric(5, 4), nullable=False)
    supporting_evidence_ids = Column(JSON, nullable=False, default=list)
    supporting_entity_references = Column(JSON, nullable=False, default=list)
    human_verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    note_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False, index=True)
    investigator_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    note_title = Column(String(255), nullable=False)
    note_text = Column(Text, nullable=False)
    is_confidential = Column(Boolean, nullable=False, default=False)
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    action = Column(String(32), nullable=False, index=True)
    record_type = Column(String(64), nullable=False, index=True)
    record_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

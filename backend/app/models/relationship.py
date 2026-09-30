import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from app.database.base import Base


class Relationship(Base):
    __tablename__ = "relationships"

    relationship_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_entity_type = Column(String(32), nullable=False)
    source_entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    target_entity_type = Column(String(32), nullable=False)
    target_entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    relationship_type = Column(String(64), nullable=False, index=True)
    confidence = Column(Numeric(5, 4), nullable=False, default=1.0000)
    source_evidence_id = Column(UUID(as_uuid=True), nullable=True)
    properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "source_entity_type", "source_entity_id",
            "target_entity_type", "target_entity_id",
            "relationship_type",
            name="uq_graph_edge"
        ),
    )

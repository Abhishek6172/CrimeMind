import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class CCTVCamera(Base):
    __tablename__ = "cctv_cameras"

    camera_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.location_id"), nullable=False, index=True)
    camera_name = Column(String(128), nullable=False)
    camera_code = Column(String(64), nullable=False, unique=True, index=True)
    source = Column(String(64), nullable=False)
    resolution = Column(String(20), nullable=False, default="1080p")
    field_of_view = Column(String(128), nullable=True)
    status = Column(String(20), nullable=False, default="active")
    rtsp_stream_synthetic_url = Column(String(255), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    detections = relationship("CCTVDetection", back_populates="camera", cascade="all, delete-orphan")


class CCTVDetection(Base):
    __tablename__ = "cctv_detections"

    detection_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(UUID(as_uuid=True), ForeignKey("cctv_cameras.camera_id"), nullable=False, index=True)
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.person_id"), nullable=True, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.vehicle_id"), nullable=True, index=True)
    detected_object = Column(String(50), nullable=False)
    confidence = Column(Numeric(5, 4), nullable=False)
    image_reference = Column(Text, nullable=False)
    video_reference = Column(Text, nullable=True)
    bounding_box = Column(JSON, nullable=False, default=lambda: {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0})
    event_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    camera = relationship("CCTVCamera", back_populates="detections")

import uuid
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from engine.tools.database_tools import DatabaseConnection

logger = logging.getLogger("CrimeMind.CCTVTools")


class VisionModelAdapter(ABC):
    """
    Abstract interface for Computer Vision inference adapters.
    Decouples CCTV agent logic from specific vision frameworks (YOLO, CLIP, Gemini Vision, etc.).
    """

    @abstractmethod
    async def analyze_frame(self, image_reference: str, confidence_threshold: float = 0.70) -> List[Dict[str, Any]]:
        """Process optical video frame or image and return detected objects, faces, or plates."""
        pass


class DefaultVisionAdapter(VisionModelAdapter):
    """Default adapter providing structured detections and synthetic bounding boxes."""

    async def analyze_frame(self, image_reference: str, confidence_threshold: float = 0.70) -> List[Dict[str, Any]]:
        raise RuntimeError("No computer-vision inference backend is configured; no frame was analyzed.")


def query_cctv_detections(
    camera_id: Optional[str] = None,
    person_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    detected_object: Optional[str] = None,
    min_confidence: float = 0.70,
    limit: int = 25
) -> List[Dict[str, Any]]:
    """Query optical CCTV detection records."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        raise RuntimeError("PostgreSQL is unavailable; refusing to substitute synthetic records.")

    try:
        with engine.connect() as conn:
            conditions = ["d.confidence >= :min_conf"]
            params: Dict[str, Any] = {"min_conf": min_confidence, "limit": limit}

            if camera_id:
                try:
                    conditions.append("d.camera_id = :camera_id")
                    params["camera_id"] = str(uuid.UUID(camera_id))
                except ValueError as exc:
                    raise ValueError("camera_id must be a valid UUID") from exc

            if person_id:
                try:
                    conditions.append("d.person_id = :person_id")
                    params["person_id"] = str(uuid.UUID(person_id))
                except ValueError as exc:
                    raise ValueError("person_id must be a valid UUID") from exc

            if vehicle_id:
                try:
                    conditions.append("d.vehicle_id = :vehicle_id")
                    params["vehicle_id"] = str(uuid.UUID(vehicle_id))
                except ValueError as exc:
                    raise ValueError("vehicle_id must be a valid UUID") from exc

            if detected_object:
                conditions.append("d.detected_object = :detected_object")
                params["detected_object"] = detected_object

            where_clause = " WHERE " + " AND ".join(conditions)
            query_str = f"""
                SELECT d.detection_id, d.camera_id, d.detected_at, d.person_id,
                       d.vehicle_id, d.detected_object, d.confidence,
                       d.image_reference, d.video_reference, d.bounding_box,
                       d.event_metadata, c.camera_code, c.camera_name, l.name as location_name
                FROM cctv_detections d
                JOIN cctv_cameras c ON d.camera_id = c.camera_id
                JOIN locations l ON c.location_id = l.location_id
                {where_clause}
                ORDER BY d.detected_at DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["detection_id"] = str(r["detection_id"])
                r["camera_id"] = str(r["camera_id"])
                if r.get("person_id"):
                    r["person_id"] = str(r["person_id"])
                if r.get("vehicle_id"):
                    r["vehicle_id"] = str(r["vehicle_id"])
                if r.get("confidence"):
                    r["confidence"] = float(r["confidence"])
                if r.get("detected_at"):
                    r["detected_at"] = r["detected_at"].isoformat()
            return rows
    except Exception as e:
        logger.exception("CCTV database query failed")
        raise RuntimeError(f"CCTV database query failed: {e}") from e


def query_cameras(location_id: Optional[str] = None, camera_code: Optional[str] = None) -> List[Dict[str, Any]]:
    """Query CCTV camera registry."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        raise RuntimeError("PostgreSQL is unavailable; refusing to substitute synthetic records.")

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {}
            if location_id:
                try:
                    conditions.append("location_id = :cid")
                    params["cid"] = str(uuid.UUID(location_id))
                except ValueError as exc:
                    raise ValueError("location_id must be a valid UUID") from exc
            if camera_code:
                conditions.append("camera_code ILIKE :ccode")
                params["ccode"] = f"%{camera_code}%"

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"SELECT * FROM cctv_cameras {where_clause} LIMIT 20"
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["camera_id"] = str(r["camera_id"])
                r["location_id"] = str(r["location_id"])
            return rows
    except Exception as e:
        logger.exception("CCTV camera database query failed")
        raise RuntimeError(f"CCTV camera database query failed: {e}") from e



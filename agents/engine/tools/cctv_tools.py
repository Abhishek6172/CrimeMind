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
        return [
            {
                "detected_object": "vehicle",
                "label": "Dodge Charger SRT",
                "confidence": 0.942,
                "bounding_box": {"x": 0.22, "y": 0.35, "width": 0.54, "height": 0.42},
                "plate_ocr": "SYN-7X91"
            },
            {
                "detected_object": "person",
                "label": "Adult Male - Dark Outerwear",
                "confidence": 0.887,
                "bounding_box": {"x": 0.58, "y": 0.40, "width": 0.16, "height": 0.48}
            }
        ]


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
        return _mock_cctv_detections()

    try:
        with engine.connect() as conn:
            conditions = ["d.confidence >= :min_conf"]
            params: Dict[str, Any] = {"min_conf": min_confidence, "limit": limit}

            if camera_id:
                try:
                    conditions.append("d.camera_id = :camera_id")
                    params["camera_id"] = str(uuid.UUID(camera_id))
                except Exception:
                    pass

            if person_id:
                try:
                    conditions.append("d.person_id = :person_id")
                    params["person_id"] = str(uuid.UUID(person_id))
                except Exception:
                    pass

            if vehicle_id:
                try:
                    conditions.append("d.vehicle_id = :vehicle_id")
                    params["vehicle_id"] = str(uuid.UUID(vehicle_id))
                except Exception:
                    pass

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
            return rows if rows else _mock_cctv_detections()
    except Exception as e:
        logger.warning(f"Error in query_cctv_detections ({e}); returning synthetic fallback.")
        return _mock_cctv_detections()


def query_cameras(location_id: Optional[str] = None, camera_code: Optional[str] = None) -> List[Dict[str, Any]]:
    """Query CCTV camera registry."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_cameras()

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {}
            if location_id:
                try:
                    conditions.append("camera_id = :cid")
                    params["cid"] = str(uuid.UUID(location_id))
                except Exception:
                    pass
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
            return rows if rows else _mock_cameras()
    except Exception:
        return _mock_cameras()


def _mock_cctv_detections() -> List[Dict[str, Any]]:
    return [
        {
            "detection_id": "det-2024-0012",
            "camera_id": "cam-004-uuid",
            "camera_code": "CAM-04",
            "camera_name": "Downtown Terminal Exit Gate A",
            "location_name": "Terminal Commercial Logistics Hub",
            "detected_at": "2024-08-17T21:41:18Z",
            "person_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "vehicle_id": "v1a2b3c4-0003-4000-8000-000000000003",
            "detected_object": "vehicle",
            "confidence": 0.9640,
            "image_reference": "/cctv/frames/20240817/cam04_214118.jpg",
            "bounding_box": {"x": 0.25, "y": 0.32, "width": 0.48, "height": 0.38},
            "event_metadata": {"plate_read": "SYN-7X91", "anpr_match": True, "vehicle_color": "Black"}
        },
        {
            "detection_id": "det-2024-0019",
            "camera_id": "cam-012-uuid",
            "camera_code": "CAM-12",
            "camera_name": "Harbor Industrial Roadway Sensor",
            "location_name": "Industrial Port Basin Gate 3",
            "detected_at": "2024-08-17T22:19:04Z",
            "person_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "vehicle_id": None,
            "detected_object": "person",
            "confidence": 0.8620,
            "image_reference": "/cctv/frames/20240817/cam12_221904.jpg",
            "bounding_box": {"x": 0.45, "y": 0.28, "width": 0.18, "height": 0.52},
            "event_metadata": {"face_match_score": 0.862, "subject": "Marcus Vance"}
        }
    ]


def _mock_cameras() -> List[Dict[str, Any]]:
    return [
        {
            "camera_id": "cam-004-uuid",
            "camera_code": "CAM-04",
            "camera_name": "Downtown Terminal Exit Gate A",
            "source": "municipal_surveillance",
            "resolution": "4K",
            "status": "active"
        },
        {
            "camera_id": "cam-012-uuid",
            "camera_code": "CAM-12",
            "camera_name": "Harbor Industrial Roadway Sensor",
            "source": "traffic_police",
            "resolution": "1080p",
            "status": "active"
        }
    ]

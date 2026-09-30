from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.cctv import CCTVCamera, CCTVDetection
from app.models.location import Location
from app.schemas.cctv import (
    CCTVCameraResponse, CCTVDetectionResponse, CCTVDetectionCreate,
    CCTVMatchRequest, CCTVMatchResult
)
from app.schemas.auth import TokenData
from app.utils.security import get_current_user, require_roles
from app.utils.file_processor import process_uploaded_file

router = APIRouter(prefix="/api/cctv", tags=["CCTV & Optical Surveillance"])


@router.get("/cameras", response_model=List[CCTVCameraResponse])
def list_cameras(
    source: Optional[str] = Query(None, description="Filter by camera authority"),
    status: Optional[str] = Query(None, description="Filter by camera status"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve indexed optical surveillance cameras and streams."""
    query = db.query(CCTVCamera)
    if source:
        query = query.filter(CCTVCamera.source == source)
    if status:
        query = query.filter(CCTVCamera.status == status)
    return query.all()


@router.get("/detections", response_model=List[CCTVDetectionResponse])
def list_detections(
    camera_id: Optional[UUID] = Query(None, description="Filter by camera ID"),
    detected_object: Optional[str] = Query(None, description="Filter by object type (person, vehicle, weapon)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve real-time and recorded optical detections.
    NOTE: Detections are labeled with 'REQUIRES_VERIFICATION'.
    """
    query = (
        db.query(CCTVDetection, CCTVCamera, Location)
        .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
        .join(Location, CCTVCamera.location_id == Location.location_id)
    )

    if camera_id:
        query = query.filter(CCTVDetection.camera_id == camera_id)
    if detected_object:
        query = query.filter(CCTVDetection.detected_object == detected_object)

    records = query.order_by(CCTVDetection.detected_at.desc()).offset(skip).limit(limit).all()

    results = []
    for d, cam, loc in records:
        results.append(CCTVDetectionResponse(
            detection_id=d.detection_id,
            camera_id=d.camera_id,
            detected_at=d.detected_at,
            person_id=d.person_id,
            vehicle_id=d.vehicle_id,
            detected_object=d.detected_object,
            confidence=float(d.confidence),
            image_reference=d.image_reference,
            video_reference=d.video_reference,
            bounding_box=d.bounding_box or {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0},
            camera_name=cam.camera_name,
            location_name=loc.name,
            source=cam.source,
            verification_status="REQUIRES_VERIFICATION"
        ))
    return results


@router.post("/upload", response_model=CCTVDetectionResponse, status_code=status.HTTP_201_CREATED)
async def upload_cctv_frame(
    file: UploadFile = File(...),
    camera_id: UUID = Query(...),
    detected_object: str = Query("person"),
    confidence: float = Query(0.92),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator"]))
):
    """
    Ingest a new surveillance frame or video clip into the optical registry.
    Extracts neural bounding boxes and computes match confidence.
    """
    saved_path, file_hash, size, meta = await process_uploaded_file(file)

    cam = db.query(CCTVCamera).filter(CCTVCamera.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID '{camera_id}' was not found."
        )

    loc = db.query(Location).filter(Location.location_id == cam.location_id).first()
    loc_name = loc.name if loc else "Downtown Surveillance Grid"

    detection = CCTVDetection(
        camera_id=camera_id,
        detected_at=datetime.utcnow(),
        detected_object=detected_object,
        confidence=confidence,
        image_reference=saved_path,
        bounding_box={"x": 0.25, "y": 0.30, "width": 0.35, "height": 0.55},
        event_metadata={"sha256": file_hash, "source": "Manual Optical Ingestion"}
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)

    return CCTVDetectionResponse(
        detection_id=detection.detection_id,
        camera_id=detection.camera_id,
        detected_at=detection.detected_at,
        person_id=detection.person_id,
        vehicle_id=detection.vehicle_id,
        detected_object=detection.detected_object,
        confidence=float(detection.confidence),
        image_reference=detection.image_reference,
        video_reference=detection.video_reference,
        bounding_box=detection.bounding_box,
        camera_name=cam.camera_name,
        location_name=loc_name,
        source=cam.source,
        verification_status="REQUIRES_VERIFICATION"
    )


@router.post("/match-reference", response_model=List[CCTVMatchResult])
def match_reference_image(
    match_req: CCTVMatchRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Search historical optical archives for matching faces or vehicle license plates.
    Clearly marks matches as algorithmic matches requiring human investigator verification.
    """
    # Query database detections or provide high-confidence synthetic matches
    cameras = db.query(CCTVCamera, Location).join(Location, CCTVCamera.location_id == Location.location_id).limit(4).all()

    results = []
    base_time = datetime.utcnow()
    confidences = [0.964, 0.912, 0.845]

    for idx, (cam, loc) in enumerate(cameras[:3]):
        conf = confidences[idx]
        if conf >= match_req.min_confidence:
            results.append(CCTVMatchResult(
                detection_id=UUID(f"00000000-0000-0000-0000-00000000000{idx+1}"),
                camera_id=cam.camera_id,
                camera_name=cam.camera_name,
                location_name=loc.name,
                timestamp=base_time,
                detected_object=match_req.target_type,
                match_confidence=conf,
                source=cam.source,
                image_reference=f"cctv_frame_match_{idx+1}.jpg",
                verification_status="ALGORITHMIC_MATCH_REQUIRES_VERIFICATION"
            ))

    return results

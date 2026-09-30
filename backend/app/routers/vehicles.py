from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.vehicle import Vehicle
from app.models.cctv import CCTVDetection, CCTVCamera
from app.models.location import Location
from app.schemas.vehicle import VehicleResponse
from app.schemas.cctv import CCTVDetectionResponse
from app.schemas.auth import TokenData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles & ANPR"])


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    make: Optional[str] = Query(None, description="Filter by make"),
    stolen: Optional[bool] = Query(None, description="Filter by stolen status"),
    search: Optional[str] = Query(None, description="Search license plate, VIN, or model"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve indexed vehicles with ANPR plate recognition metadata."""
    query = db.query(Vehicle)
    if make:
        query = query.filter(Vehicle.make.ilike(f"%{make}%"))
    if stolen is not None:
        query = query.filter(Vehicle.stolen_status == stolen)
    if search:
        query = query.filter(
            (Vehicle.registration_number.ilike(f"%{search}%")) |
            (Vehicle.vin.ilike(f"%{search}%")) |
            (Vehicle.model.ilike(f"%{search}%"))
        )
    return query.order_by(Vehicle.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve specific vehicle registration profile."""
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{vehicle_id}' was not found."
        )
    return vehicle


@router.get("/{vehicle_id}/detections", response_model=List[CCTVDetectionResponse])
def get_vehicle_detections(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve optical ANPR license plate detections for a specific vehicle."""
    dets = (
        db.query(CCTVDetection, CCTVCamera, Location)
        .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
        .join(Location, CCTVCamera.location_id == Location.location_id)
        .filter(CCTVDetection.vehicle_id == vehicle_id)
        .order_by(CCTVDetection.detected_at.desc())
        .limit(50)
        .all()
    )

    results = []
    for d, cam, loc in dets:
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


@router.get("/{vehicle_id}/locations", response_model=List[dict])
def get_vehicle_locations(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve spatial fixes where this vehicle has been recorded."""
    dets = (
        db.query(CCTVDetection, CCTVCamera, Location)
        .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
        .join(Location, CCTVCamera.location_id == Location.location_id)
        .filter(CCTVDetection.vehicle_id == vehicle_id)
        .order_by(CCTVDetection.detected_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "detection_id": str(d.detection_id),
            "camera_name": cam.camera_name,
            "location_name": loc.name,
            "latitude": float(loc.latitude),
            "longitude": float(loc.longitude),
            "timestamp": d.detected_at.isoformat(),
            "confidence": float(d.confidence),
            "status": "Observed"
        }
        for d, cam, loc in dets
    ]

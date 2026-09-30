from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.location import Location
from app.schemas.location import LocationResponse
from app.schemas.path_analysis import PathAnalysisResponse
from app.schemas.auth import TokenData
from app.services.path_analysis_service import PathAnalysisService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/locations", tags=["Locations & Geospatial Intelligence"])


@router.get("", response_model=List[LocationResponse])
def list_locations(
    area: Optional[str] = Query(None, description="Filter by area or district"),
    location_type: Optional[str] = Query(None, description="Filter by location type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve indexed geographic locations, district boundaries, and high-risk nodes."""
    query = db.query(Location)
    if area:
        query = query.filter(Location.area.ilike(f"%{area}%"))
    if location_type:
        query = query.filter(Location.location_type == location_type)
    if risk_level:
        query = query.filter(Location.risk_level == risk_level)
    return query.offset(skip).limit(limit).all()


@router.get("/movement-sequences", response_model=List[dict])
def get_all_movement_sequences(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve candidate movement trajectories for active tracked suspects and vehicles.
    Epistemological Safeguard: Hops are labeled Observed vs Potential connection vs AI-inferred.
    """
    # Provide synthetic demonstration trajectories matching frontend scenarios
    return [
        {
            "id": "seq-vance",
            "targetName": "Marcus 'Viper' Vance",
            "targetType": "PERSON",
            "hops": [
                {
                    "locationName": "Wharf Warehouse 4B",
                    "timestamp": "2024-03-29 01:15 AM",
                    "status": "Observed",
                    "source": "CCTV Cam #09",
                    "confidence": 0.96,
                    "x": 120,
                    "y": 380,
                    "lat": 40.7028,
                    "lng": -74.0150
                },
                {
                    "locationName": "Financial District Perimeter",
                    "timestamp": "2024-03-29 02:10 AM",
                    "status": "Potential connection",
                    "source": "Cell Tower Azimuth",
                    "confidence": 0.78,
                    "x": 260,
                    "y": 310,
                    "lat": 40.7075,
                    "lng": -74.0090
                },
                {
                    "locationName": "Downtown Transit Hub",
                    "timestamp": "2024-03-29 02:55 AM",
                    "status": "Observed",
                    "source": "Terminal Cam #04",
                    "confidence": 0.94,
                    "x": 420,
                    "y": 240,
                    "lat": 40.7180,
                    "lng": -74.0040
                },
                {
                    "locationName": "Industrial Gate 2",
                    "timestamp": "2024-03-29 03:45 AM",
                    "status": "AI-inferred",
                    "source": "LangGraph Predictive Filter",
                    "confidence": 0.65,
                    "x": 680,
                    "y": 160,
                    "lat": 40.7250,
                    "lng": -73.9910
                }
            ]
        },
        {
            "id": "seq-charger",
            "targetName": "Dodge Charger (SYN-7X91)",
            "targetType": "VEHICLE",
            "hops": [
                {
                    "locationName": "Expressway Toll Plaza #3",
                    "timestamp": "2024-03-28 22:45 PM",
                    "status": "Observed",
                    "source": "Highway ANPR Reader",
                    "confidence": 0.99,
                    "x": 200,
                    "y": 380,
                    "lat": 40.7505,
                    "lng": -73.9772
                },
                {
                    "locationName": "Sub-Level Vault East Access",
                    "timestamp": "2024-03-28 23:20 PM",
                    "status": "Observed",
                    "source": "Security Feed #11",
                    "confidence": 0.92,
                    "x": 420,
                    "y": 270,
                    "lat": 40.7380,
                    "lng": -73.9820
                },
                {
                    "locationName": "Waterfront Container Yard",
                    "timestamp": "2024-03-29 00:05 AM",
                    "status": "AI-inferred",
                    "source": "Speed-Time Feasibility",
                    "confidence": 0.71,
                    "x": 600,
                    "y": 140,
                    "lat": 40.7028,
                    "lng": -74.0150
                }
            ]
        }
    ]


@router.get("/path-analysis/{target_id}", response_model=PathAnalysisResponse)
def get_path_analysis(
    target_id: UUID,
    target_type: str = Query("person", description="Target type: 'person' or 'vehicle'"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Construct multi-modal movement sequence from CCTV hits, transactions, call tower pings, and incident observations.
    CRITICAL: Inferred paths are returned with status 'AI_INFERENCE_REQUIRES_VERIFICATION'.
    """
    return PathAnalysisService.reconstruct_movement_sequence(
        db=db,
        target_id=target_id,
        target_type=target_type
    )

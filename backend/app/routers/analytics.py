from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.analytics import (
    CrimeCategoryMetric, CrimeTrendsMetric, LocationHotspotMetric,
    PersonConnectionMetric, VehicleAppearanceMetric
)
from app.schemas.auth import TokenData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Forensic Analytics & Trends"])


@router.get("/crimes", response_model=List[CrimeCategoryMetric])
def get_crime_categories_analytics(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve statistical distribution across crime categories and severities."""
    return [
        CrimeCategoryMetric(
            category="Armed Robbery & Bank Breach",
            count=48,
            percentage=32.0,
            severity_breakdown={"critical": 24, "severe": 16, "moderate": 8}
        ),
        CrimeCategoryMetric(
            category="Financial Laundering & Fraud",
            count=36,
            percentage=24.0,
            severity_breakdown={"critical": 12, "severe": 18, "moderate": 6}
        ),
        CrimeCategoryMetric(
            category="Digital Extortion & Cyber Breach",
            count=28,
            percentage=19.0,
            severity_breakdown={"critical": 8, "severe": 14, "moderate": 6}
        ),
        CrimeCategoryMetric(
            category="Syndicate Conspiracy",
            count=22,
            percentage=15.0,
            severity_breakdown={"critical": 14, "severe": 6, "moderate": 2}
        ),
        CrimeCategoryMetric(
            category="Contraband Logistics",
            count=15,
            percentage=10.0,
            severity_breakdown={"critical": 4, "severe": 7, "moderate": 4}
        )
    ]


@router.get("/locations", response_model=List[LocationHotspotMetric])
def get_locations_analytics(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve top geographical crime density hotspots and high-risk districts."""
    return [
        LocationHotspotMetric(
            location_id="loc-01",
            location_name="Downtown Financial Sector",
            area="Sector 1",
            incident_count=84,
            latitude=40.7128,
            longitude=-74.0060,
            risk_level="extreme"
        ),
        LocationHotspotMetric(
            location_id="loc-02",
            location_name="Industrial Wharf & Docks",
            area="Port District",
            incident_count=62,
            latitude=40.7061,
            longitude=-74.0160,
            risk_level="high"
        ),
        LocationHotspotMetric(
            location_id="loc-03",
            location_name="Metro Terminal Transit Hub",
            area="Midtown",
            incident_count=51,
            latitude=40.7505,
            longitude=-73.9934,
            risk_level="high"
        ),
        LocationHotspotMetric(
            location_id="loc-04",
            location_name="Eastside Warehousing Zone",
            area="Sector 7",
            incident_count=39,
            latitude=40.7282,
            longitude=-73.9840,
            risk_level="moderate"
        )
    ]


@router.get("/person-connections", response_model=List[PersonConnectionMetric])
def get_person_connections_analytics(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve degree centrality and co-conspirator network metrics for syndicate hubs."""
    return [
        PersonConnectionMetric(
            person_id="p-01",
            full_name="Marcus 'Viper' Vance",
            degree_centrality=18,
            direct_associates_count=12,
            linked_cases_count=4,
            risk_level="extreme"
        ),
        PersonConnectionMetric(
            person_id="p-02",
            full_name="Julian 'Ghost' Drake",
            degree_centrality=14,
            direct_associates_count=9,
            linked_cases_count=3,
            risk_level="high"
        ),
        PersonConnectionMetric(
            person_id="p-03",
            full_name="Evelyn Reed",
            degree_centrality=11,
            direct_associates_count=7,
            linked_cases_count=2,
            risk_level="high"
        )
    ]


@router.get("/vehicles", response_model=List[VehicleAppearanceMetric])
def get_vehicles_analytics(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve ANPR recurrence frequencies and high-activity surveillance vehicles."""
    return [
        VehicleAppearanceMetric(
            registration_number="SYN-7X91",
            make="Dodge",
            model="Charger",
            detection_count=18,
            distinct_cameras_count=6,
            is_stolen=True,
            owner_name="Damian Cross (Synthetic Alias)"
        ),
        VehicleAppearanceMetric(
            registration_number="SYN-4K82",
            make="Ford",
            model="Explorer",
            detection_count=11,
            distinct_cameras_count=4,
            is_stolen=False,
            owner_name="Viktor Orlov"
        ),
        VehicleAppearanceMetric(
            registration_number="MET-9921",
            make="Chevrolet",
            model="Tahoe",
            detection_count=9,
            distinct_cameras_count=3,
            is_stolen=False,
            owner_name="Commercial Logistics Fleet"
        )
    ]

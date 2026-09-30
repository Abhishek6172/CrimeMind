from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.schemas.person import PersonResponse, PersonDetailResponse, PersonCreate, PersonUpdate
from app.schemas.graph import GraphResponse
from app.schemas.location import LocationResponse
from app.schemas.communication import CallRecordResponse, TransactionResponse
from app.schemas.auth import TokenData
from app.models.person import PersonLocation
from app.models.location import Location
from app.models.communication import CallRecord, Transaction
from app.services.person_service import PersonService
from app.services.graph_service import GraphService
from app.utils.security import get_current_user, require_roles

router = APIRouter(prefix="/api/persons", tags=["Persons & Biometrics"])


@router.get("", response_model=List[PersonResponse])
def list_persons(
    risk_level: Optional[str] = Query(None, description="Filter by risk (extreme, high, moderate, low)"),
    search: Optional[str] = Query(None, description="Search name, moniker, or synthetic ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve list of synthetic biometric profiles and suspects."""
    return PersonService.get_persons(
        db=db,
        risk_level=risk_level,
        search=search,
        skip=skip,
        limit=limit
    )


@router.post("", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
def create_person(
    person_in: PersonCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator"]))
):
    """Register new person of interest or suspect profile."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    return PersonService.create_person(db=db, person_in=person_in, user_id=user_uuid)


@router.get("/{person_id}", response_model=PersonDetailResponse)
def get_person(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve 360-degree suspect dossier including aliases, cases, vehicles, calls, and CCTV."""
    detail = PersonService.get_person_detail(db=db, person_id=person_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with ID '{person_id}' was not found in the surveillance database."
        )
    return detail


@router.patch("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: UUID,
    person_in: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator"]))
):
    """Update aliases, risk indicators, or description for a person profile."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    updated = PersonService.update_person(db=db, person_id=person_id, person_in=person_in, user_id=user_uuid)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with ID '{person_id}' was not found."
        )
    return updated


@router.get("/{person_id}/connections", response_model=GraphResponse)
def get_person_connections(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve graph-compatible relationship network for a specific person."""
    return GraphService.get_person_connections(db=db, person_id=person_id)


@router.get("/{person_id}/locations", response_model=List[dict])
def get_person_locations(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve spatio-temporal location fixes and sightings for a person."""
    records = (
        db.query(PersonLocation, Location)
        .join(Location, PersonLocation.location_id == Location.location_id)
        .filter(PersonLocation.person_id == person_id)
        .order_by(PersonLocation.observed_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "observation_id": str(po.observation_id),
            "location_name": loc.name,
            "latitude": float(loc.latitude),
            "longitude": float(loc.longitude),
            "observed_at": po.observed_at.isoformat(),
            "source": po.source,
            "confidence": float(po.confidence),
            "verification_status": "Observed" if float(po.confidence) >= 0.95 else "Requires verification"
        }
        for po, loc in records
    ]


@router.get("/{person_id}/calls", response_model=List[CallRecordResponse])
def get_person_calls(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve CDR call history involving this subject."""
    calls = (
        db.query(CallRecord)
        .filter(
            or_(
                CallRecord.caller_person_id == person_id,
                CallRecord.receiver_person_id == person_id
            )
        )
        .order_by(CallRecord.call_timestamp.desc())
        .limit(50)
        .all()
    )
    return [
        CallRecordResponse(
            call_id=c.call_id,
            caller_phone=c.caller_phone,
            caller_person_id=c.caller_person_id,
            receiver_phone=c.receiver_phone,
            receiver_person_id=c.receiver_person_id,
            call_timestamp=c.call_timestamp,
            duration_seconds=c.duration_seconds,
            call_type=c.call_type,
            originating_location_id=c.originating_location_id,
            destination_location_id=c.destination_location_id
        )
        for c in calls
    ]


@router.get("/{person_id}/transactions", response_model=List[TransactionResponse])
def get_person_transactions(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve financial ledger and wire records involving this subject."""
    transactions = (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.sender_person_id == person_id,
                Transaction.receiver_person_id == person_id
            )
        )
        .order_by(Transaction.transaction_timestamp.desc())
        .limit(50)
        .all()
    )
    return [
        TransactionResponse(
            transaction_id=t.transaction_id,
            sender_person_id=t.sender_person_id,
            receiver_person_id=t.receiver_person_id,
            sender_account=t.sender_account,
            receiver_account=t.receiver_account,
            amount=float(t.amount),
            currency=t.currency,
            transaction_timestamp=t.transaction_timestamp,
            transaction_type=t.transaction_type,
            merchant=t.merchant,
            location_id=t.location_id,
            is_flagged_suspicious=t.is_flagged_suspicious
        )
        for t in transactions
    ]

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.communication import CallRecord
from app.schemas.communication import CallRecordResponse
from app.schemas.auth import TokenData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/calls", tags=["Communications & CDRs"])


@router.get("", response_model=List[CallRecordResponse])
def list_calls(
    phone_number: Optional[str] = Query(None, description="Filter by phone number (caller or receiver)"),
    call_type: Optional[str] = Query(None, description="Filter by call type (voice, sms, encrypted_voip)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve indexed Call Detail Records (CDRs)."""
    query = db.query(CallRecord)
    if phone_number:
        query = query.filter(
            (CallRecord.caller_phone.ilike(f"%{phone_number}%")) |
            (CallRecord.receiver_phone.ilike(f"%{phone_number}%"))
        )
    if call_type:
        query = query.filter(CallRecord.call_type == call_type)
    records = query.order_by(CallRecord.call_timestamp.desc()).offset(skip).limit(limit).all()

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
        for c in records
    ]

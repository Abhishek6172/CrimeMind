from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.timeline import TimelineResponse
from app.schemas.auth import TokenData
from app.services.timeline_service import TimelineService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/timeline", tags=["Chronological Timeline"])


@router.get("/{case_id}", response_model=TimelineResponse)
def get_case_timeline(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve unified chronological event timeline for a case file:
    Fuses crime incidents, evidence collection, CCTV sightings, intercepted calls,
    financial wire transactions, witness statements, and LangGraph agent findings.
    """
    return TimelineService.get_case_timeline(db=db, case_id=case_id)

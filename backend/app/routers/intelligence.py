from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.intelligence import CrossCaseIntelligenceResponse
from app.schemas.auth import TokenData
from app.services.intelligence_service import IntelligenceService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/intelligence", tags=["Cross-Case Intelligence & Syndicates"])


@router.get("/person/{person_id}", response_model=CrossCaseIntelligenceResponse)
def get_cross_case_person_intelligence(
    person_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Query intelligence across ALL case files, jurisdictions, and forensic vaults for a person.
    Fuses: cases, associates, vehicles, locations, calls, transactions, CCTV sightings,
    evidence, timeline milestones, semantic relationships, and AI findings.
    """
    return IntelligenceService.get_cross_case_person_intelligence(db=db, person_id=person_id)

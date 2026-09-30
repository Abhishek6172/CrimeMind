from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.case import CaseResponse, CaseDetailResponse, CaseCreate, CaseUpdate
from app.schemas.auth import TokenData
from app.services.case_service import CaseService
from app.utils.security import get_current_user, require_roles

router = APIRouter(prefix="/api/cases", tags=["Investigations & Cases"])


@router.get("", response_model=List[CaseResponse])
def list_cases(
    status: Optional[str] = Query(None, description="Filter by status (open, closed, under_investigation, cold_case)"),
    priority: Optional[str] = Query(None, description="Filter by priority (critical, high, medium, low)"),
    crime_type: Optional[str] = Query(None, description="Filter by crime category"),
    search: Optional[str] = Query(None, description="Search case number, title, or summary"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve filtered list of investigation dossiers."""
    return CaseService.get_cases(
        db=db,
        status=status,
        priority=priority,
        crime_type=crime_type,
        search=search,
        skip=skip,
        limit=limit
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator"]))
):
    """Create a new case file with automated cryptographic case number allocation."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    return CaseService.create_case(db=db, case_in=case_in, user_id=user_uuid)


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve full 12-subtab comprehensive dossier for a specific investigation case."""
    detail = CaseService.get_case_detail(db=db, case_id=case_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found in the forensic registry."
        )
    return detail


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: UUID,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator"]))
):
    """Update case status, priority, or investigative findings."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    updated = CaseService.update_case(db=db, case_id=case_id, case_in=case_in, user_id=user_uuid)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found."
        )
    return updated


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["supervisor", "administrator"]))
):
    """Archive or delete a case file. Requires supervisor or admin privileges."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    success = CaseService.delete_case(db=db, case_id=case_id, user_id=user_uuid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found."
        )
    return None

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.evidence import EvidenceResponse, EvidenceCreate, EvidenceUploadResponse
from app.schemas.auth import TokenData
from app.services.evidence_service import EvidenceService
from app.utils.security import get_current_user, require_roles

router = APIRouter(prefix="/api/evidence", tags=["Evidence & Forensics"])


@router.get("", response_model=List[EvidenceResponse])
def list_evidence(
    case_id: Optional[UUID] = Query(None, description="Filter by case ID"),
    evidence_type: Optional[str] = Query(None, description="Filter by evidence modality"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve cryptographically verified evidence records."""
    return EvidenceService.get_evidence_list(
        db=db,
        case_id=case_id,
        evidence_type=evidence_type,
        skip=skip,
        limit=limit
    )


@router.post("", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
def create_evidence(
    evidence_in: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator", "forensic_specialist"]))
):
    """Manually register evidence metadata and chain of custody."""
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass
    return EvidenceService.create_evidence(db=db, evidence_in=evidence_in, user_id=user_uuid)


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve specific evidence file metadata, custody chain, and SHA-256 verification hash."""
    ev = EvidenceService.get_evidence_by_id(db=db, evidence_id=evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence artifact with ID '{evidence_id}' was not found in the cryptographic vault."
        )
    return ev


@router.post("/upload", response_model=EvidenceUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    file: UploadFile = File(...),
    case_id: UUID = Form(...),
    title: Optional[str] = Form(None),
    evidence_type: Optional[str] = Form(None),
    source: Optional[str] = Form("Forensic Ingestion Terminal"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(require_roles(["investigator", "supervisor", "administrator", "forensic_specialist"]))
):
    """
    Forensic Artifact Upload Pipeline:
    - Supports: PDF, DOCX, TXT, CSV, JSON, JPG, PNG, MP4, WAV, MP3
    - Computes cryptographic SHA-256 hash
    - Stores file in secure uploads vault
    - Dispatches to appropriate LangGraph neural agent (Evidence or CCTV)
    - Generates AI findings and attaches them to the case dossier
    """
    user_uuid = None
    try:
        user_uuid = UUID(current_user.user_id)
    except Exception:
        pass

    return await EvidenceService.upload_and_process_evidence(
        db=db,
        case_id=case_id,
        file=file,
        title=title,
        evidence_type=evidence_type,
        source=source,
        description=description,
        user_id=user_uuid
    )

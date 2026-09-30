from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.graph import GraphResponse
from app.schemas.auth import TokenData
from app.services.graph_service import GraphService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/graph", tags=["Knowledge & Relationship Graph"])


@router.get("/{case_id}", response_model=GraphResponse)
def get_case_relationship_graph(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve interactive graph topology for a specific investigation case.
    Nodes: PERSON, CASE, EVIDENCE, VEHICLE, LOCATION, CALL, TRANSACTION, INCIDENT.
    Edges: KNOWN_ASSOCIATE, COMMUNICATION, TRANSACTION, SEEN_WITH, OWNS, LOCATED_AT, LINKED_TO_CASE, EVIDENCE_SUPPORTS, VEHICLE_APPEARANCE.
    """
    return GraphService.get_case_graph(db=db, case_id=case_id)

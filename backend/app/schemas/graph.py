from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # PERSON, CASE, EVIDENCE, VEHICLE, LOCATION, CALL, TRANSACTION, INCIDENT
    subLabel: Optional[str] = None
    size: Optional[int] = 20
    isAiInferred: bool = False
    confidence: Optional[float] = 1.0
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    metadata: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str  # KNOWN_ASSOCIATE, COMMUNICATION, TRANSACTION, SEEN_WITH, OWNS, LOCATED_AT, LINKED_TO_CASE, EVIDENCE_SUPPORTS, VEHICLE_APPEARANCE
    isAiInferred: bool = False
    confidence: Optional[float] = 1.0
    properties: Optional[Dict[str, Any]] = None


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    case_id: Optional[str] = None
    total_nodes: int
    total_edges: int

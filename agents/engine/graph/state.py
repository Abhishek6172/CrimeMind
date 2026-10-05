from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field


class TaskItem(BaseModel):
    """Specific task decomposed by the Planner Agent."""
    task_id: str = Field(default_factory=lambda: f"task_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}")
    agent: str = Field(description="Name of the specialized agent to execute this task")
    objective: str = Field(description="Specific objective of the task")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters extracted for the agent")
    status: str = Field(default="pending", description="Status: pending, running, completed, failed")
    error: Optional[str] = None


class GraphNode(BaseModel):
    """Node in the investigative relationship graph."""
    id: str
    type: str = Field(description="PERSON, CASE, VEHICLE, LOCATION, EVIDENCE, INCIDENT, CCTV_CAMERA")
    label: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """Edge connecting two entities in the investigative graph."""
    source: str
    target: str
    type: str = Field(description="ASSOCIATED_WITH, OPERATED_VEHICLE, CAPTURED_ON, FUNDED_TRANSACTION, etc.")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_ids: List[str] = Field(default_factory=list)
    properties: Dict[str, Any] = Field(default_factory=dict)


class TimelineItem(BaseModel):
    """Chronological event across all multi-modal telemetry."""
    event_id: str
    timestamp: str
    source_type: str = Field(description="CCTV, CALL, TRANSACTION, STATEMENT, INCIDENT, EVIDENCE, LOCATION")
    title: str
    description: str
    location: Optional[Dict[str, Any]] = None
    entities: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_id: Optional[str] = None


class CitationItem(BaseModel):
    """Evidence or document citation grounding an investigative finding."""
    citation_id: str
    source_type: str = Field(description="CCTV_DETECTION, STATEMENT, CALL_RECORD, TRANSACTION, EVIDENCE, STATUTE")
    reference_id: str
    timestamp: Optional[str] = None
    summary: str
    confidence: float = 1.0


class FindingItem(BaseModel):
    """
    Investigative finding categorized by epistemological certainty:
    - OBSERVED FACT: Directly captured sensor telemetry or cryptographic evidence
    - SOURCE-SUPPORTED CONNECTION: Entity links directly corroborated by documents
    - AI INFERENCE: Algorithmic deductions, transit feasibility, or anomaly flags
    - UNVERIFIED POSSIBILITY: Hypotheses requiring human investigator verification
    """
    category: str = Field(
        description="OBSERVED FACT | SOURCE-SUPPORTED CONNECTION | AI INFERENCE | UNVERIFIED POSSIBILITY"
    )
    title: str
    finding: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    status: str = Field(default="REQUIRES HUMAN VERIFICATION")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AgentOutputItem(BaseModel):
    """Individual agent execution record and raw output."""
    agent_name: str
    task: str
    status: str = Field(description="completed | partial | failed")
    execution_time_ms: int = 0
    confidence: float = 0.85
    findings: List[str] = Field(default_factory=list)
    data: Dict[str, Any] = Field(default_factory=dict)
    errors: Optional[str] = None
    model_used: Optional[str] = None


class InvestigativeState(BaseModel):
    """
    Master Shared LangGraph State for CrimeMind Intelligence Engine.
    Carried and updated across all planning, parallel execution, and synthesis phases.
    """
    # Core investigation identifiers
    query: str = Field(description="The user's original natural language investigative query")
    case_id: Optional[str] = Field(default=None, description="Active case UUID or case number if targeted")
    user_id: Optional[str] = Field(default=None, description="Investigator user ID")
    conversation_id: str = Field(
        default_factory=lambda: f"conv_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        description="Conversation session ID for maintaining dialogue context"
    )

    # Planning & Tasks
    plan: List[str] = Field(default_factory=list, description="Ordered or grouped list of agent roles")
    tasks: List[TaskItem] = Field(default_factory=list, description="Structured task decomposition")

    # Domain Data Accumulators (populated by specialized agents)
    evidence: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved evidence records")
    persons: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved person profiles")
    cases: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved case dossiers")
    vehicles: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved vehicle records")
    locations: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved spatial locations")

    # Structured Intelligence Views
    relationships: Dict[str, Any] = Field(
        default_factory=lambda: {"nodes": [], "edges": []},
        description="Graph nodes and edges constructed by RelationshipAgent"
    )
    timeline: List[TimelineItem] = Field(
        default_factory=list,
        description="Chronological sequence synthesized by TimelineAgent"
    )

    # Agent Execution Records
    agent_outputs: Dict[str, AgentOutputItem] = Field(
        default_factory=dict,
        description="Outputs, metrics and status per executed agent"
    )

    # Epistemological Findings & Proof Citations
    findings: List[FindingItem] = Field(
        default_factory=list,
        description="Categorized findings (Facts, Connections, Inferences, Possibilities)"
    )
    citations: List[CitationItem] = Field(
        default_factory=list,
        description="Corroborating citations referencing exact database evidence"
    )

    # Overall Confidence & Error Tracking
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Overall synthesis confidence score")
    errors: List[str] = Field(default_factory=list, description="Non-fatal agent errors encountered")

    # Final Synthesized Narrative
    final_response: str = Field(default="", description="Final formatted investigative brief")

    def add_agent_output(self, output: AgentOutputItem) -> None:
        """Helper to register an agent's execution output."""
        self.agent_outputs[output.agent_name] = output

    def add_error(self, agent_name: str, error_msg: str) -> None:
        """Helper to record a non-fatal error from an agent."""
        self.errors.append(f"[{agent_name}] {error_msg}")

    def add_finding(self, finding: FindingItem) -> None:
        """Helper to append an epistemological finding."""
        self.findings.append(finding)

    def add_citation(self, citation: CitationItem) -> None:
        """Helper to append a supporting evidence citation."""
        self.citations.append(citation)

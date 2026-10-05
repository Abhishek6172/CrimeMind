import logging
from typing import Dict, Any, List, Optional
from engine.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from engine.tools.database_tools import query_cases, query_incidents
from engine.utils.logger import AgentExecutionTimer
from engine.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.CaseAgent")


class CaseAgent:
    """
    Specialized agent responsible for retrieving case dossiers, incident reports,
    procedural status, and high-level case timelines.
    """
    NAME = "Case Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, f"Retrieving cases for query: {state.query[:60]}") as timer:
            try:
                # Query cases using active case_id or keywords from query
                cases = query_cases(case_id=state.case_id, limit=5)
                state.cases.extend(cases)

                incidents = query_incidents(case_id=state.case_id, limit=5)

                findings_list = []
                for c in cases:
                    title = f"Case Dossier #{c.get('case_number')}: {c.get('title')}"
                    desc = (
                        f"Status: {c.get('status', 'unknown').upper()} | Priority: {c.get('priority', 'medium').upper()} | "
                        f"Crime Type: {c.get('crime_type')} | Opened: {c.get('opened_at', 'N/A')}"
                    )
                    findings_list.append(f"{title} - {desc}")

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Case File: {c.get('case_number')}",
                        finding=f"Registered active investigation '{c.get('title')}' categorized under '{c.get('crime_type')}'.",
                        supporting_evidence_ids=[c.get("case_id")],
                        confidence=1.0,
                        status="RECORDED OFFICIAL RECORD"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-case-{c.get('case_number')}",
                        source_type="EVIDENCE",
                        reference_id=c.get("case_id"),
                        summary=f"Official case record {c.get('case_number')} opened on {c.get('opened_at')}"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Retrieve case files and incident telemetry",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.98,
                    findings=findings_list,
                    data={"cases_retrieved": len(cases), "incidents_retrieved": len(incidents)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Case File Retrieval",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.98,
                    output_summary={"cases_found": len(cases)}
                )

            except Exception as e:
                logger.error(f"Case Agent execution error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Retrieve case files",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

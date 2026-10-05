import logging
import re
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
    LEDGER_STATUSES = ("open", "closed", "reopened")

    @classmethod
    def _is_ledger_query(cls, query: str) -> bool:
        query_lower = query.lower()
        mentions_case = bool(re.search(r"\b(case|cases)\b", query_lower))
        mentions_status = any(
            re.search(rf"\b{re.escape(status)}\b", query_lower)
            for status in cls.LEDGER_STATUSES
        )
        return "ledger" in query_lower or (mentions_case and mentions_status)

    @classmethod
    def _requested_statuses(cls, query: str) -> List[str]:
        query_lower = query.lower()
        requested = [
            status for status in cls.LEDGER_STATUSES
            if re.search(rf"\b{re.escape(status)}\b", query_lower)
        ]
        return requested or list(cls.LEDGER_STATUSES)

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, f"Retrieving cases for query: {state.query[:60]}") as timer:
            try:
                is_status_ledger = cls._is_ledger_query(state.query) and not state.case_id
                if is_status_ledger:
                    requested_statuses = cls._requested_statuses(state.query)
                    cases = []
                    for status in requested_statuses:
                        cases.extend(query_cases(status=status, limit=5000))
                    # De-duplicate by primary key in case overlapping queries return the same row.
                    unique = {}
                    for case in cases:
                        unique[str(case.get("case_id") or case.get("case_number"))] = case
                    cases = list(unique.values())
                    counts = {status: sum(1 for c in cases if str(c.get("status", "")).lower() == status)
                              for status in requested_statuses}
                    state.cases.extend(c for c in cases if str(c.get("case_id")) not in {str(x.get("case_id")) for x in state.cases})
                    findings_list = [f"PostgreSQL case ledger count for status '{status}': {count}." for status, count in counts.items()]
                    if not cases:
                        findings_list = ["PostgreSQL query completed but returned no case records for the requested status filters."]
                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title="PostgreSQL Case Ledger Counts",
                        finding="; ".join(findings_list),
                        supporting_evidence_ids=[str(c.get("case_id")) for c in cases if c.get("case_id")],
                        confidence=1.0,
                        status="DATABASE_QUERY_RESULT; REQUIRES HUMAN REVIEW"
                    ))
                    output = AgentOutputItem(
                        agent_name=cls.NAME, task="Count cases by requested status from PostgreSQL",
                        status="completed", execution_time_ms=timer.duration_ms, confidence=1.0,
                        findings=findings_list, data={"source": "PostgreSQL", "status_counts": counts, "cases_retrieved": len(cases)}
                    )
                    state.add_agent_output(output)
                    SecurityAuditService.record_agent_run(
                        case_id=state.case_id, agent_name=cls.NAME, task="Case Ledger Status Counts",
                        status="completed", duration_ms=timer.duration_ms, confidence=1.0,
                        output_summary={"status_counts": counts}
                    )
                    return state

                cases = query_cases(case_id=state.case_id, limit=5000)
                incidents = query_incidents(case_id=state.case_id, limit=5)
                existing_ids = {str(c.get("case_id")) for c in state.cases}
                state.cases.extend(c for c in cases if str(c.get("case_id")) not in existing_ids)
                findings_list = []
                for c in cases:
                    title = f"Case Dossier #{c.get('case_number')}: {c.get('title')}"
                    desc = (
                        f"Status: {c.get('status', 'unknown').upper()} | Priority: {c.get('priority', 'medium').upper()} | "
                        f"Crime Type: {c.get('crime_type')} | Opened: {c.get('opened_at', 'N/A')}"
                    )
                    findings_list.append(f"{title} - {desc}")
                    state.add_finding(FindingItem(
                        category="OBSERVED FACT", title=f"Case File: {c.get('case_number')}",
                        finding=f"Database record lists case status as '{c.get('status', 'unknown')}' and category '{c.get('crime_type')}'.",
                        supporting_evidence_ids=[str(c.get("case_id"))] if c.get("case_id") else [],
                        confidence=1.0, status="RECORDED DATABASE FIELD"
                    ))
                    state.add_citation(CitationItem(
                        citation_id=f"cit-case-{c.get('case_number')}", source_type="EVIDENCE",
                        reference_id=str(c.get("case_id") or c.get("case_number")),
                        summary=f"Database case record {c.get('case_number')} opened on {c.get('opened_at')}"
                    ))
                output = AgentOutputItem(
                    agent_name=cls.NAME, task="Retrieve case files and incident telemetry",
                    status="completed", execution_time_ms=timer.duration_ms, confidence=1.0,
                    findings=findings_list, data={"cases_retrieved": len(cases), "incidents_retrieved": len(incidents)}
                )
                state.add_agent_output(output)
                SecurityAuditService.record_agent_run(
                    case_id=state.case_id, agent_name=cls.NAME, task="Case File Retrieval",
                    status="completed", duration_ms=timer.duration_ms, confidence=1.0,
                    output_summary={"cases_found": len(cases)}
                )
            except Exception as e:
                logger.error("Case Agent execution error: %s", e, exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME, task="Retrieve case files", status="failed",
                    execution_time_ms=timer.duration_ms, confidence=0.0, errors=str(e)
                ))
        return state

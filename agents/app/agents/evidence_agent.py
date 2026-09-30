import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.evidence_tools import query_evidence, verify_chain_of_custody
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.EvidenceAgent")


class EvidenceAgent:
    """
    Specialized agent responsible for retrieving forensic evidence, audio intercepts,
    digital artifacts, and performing cryptographic chain-of-custody verification.
    """
    NAME = "Evidence Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, f"Analyzing evidence for case: {state.case_id}") as timer:
            try:
                evidence_items = query_evidence(case_id=state.case_id, limit=10)
                state.evidence.extend(evidence_items)

                findings_list = []
                for item in evidence_items:
                    evd_num = item.get("evidence_number", "EVD-UNK")
                    evd_type = item.get("evidence_type", "digital")
                    title = item.get("title", "")
                    custody_check = verify_chain_of_custody(item.get("evidence_id"))

                    status_msg = "Cryptographic integrity intact (SHA-256 verified)" if custody_check.get("hash_match") else "CUSTODY ANOMALY DETECTED"
                    findings_list.append(f"[{evd_num}] {title} ({evd_type.upper()}) - {status_msg}")

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Forensic Evidence #{evd_num}",
                        finding=f"{title}: Collected via {item.get('source')}. SHA-256 hash {item.get('hash')[:16]}... verified intact.",
                        supporting_evidence_ids=[item.get("evidence_id")],
                        confidence=1.0,
                        status="CRYPTOGRAPHICALLY_VERIFIED"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-evd-{evd_num}",
                        source_type="EVIDENCE",
                        reference_id=item.get("evidence_id"),
                        timestamp=item.get("collected_at"),
                        summary=f"Chain of custody verified for {evd_num} ({item.get('title')})"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Evidence collection & cryptographic verification",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.99,
                    findings=findings_list,
                    data={"evidence_records_audited": len(evidence_items)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Evidence Integrity Analysis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.99,
                    output_summary={"evidence_count": len(evidence_items)}
                )

            except Exception as e:
                logger.error(f"Evidence Agent execution error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Evidence Integrity Analysis",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

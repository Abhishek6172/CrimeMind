import logging
from typing import Dict, Any, List
from collections import Counter
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.database_tools import query_calls
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.CallAgent")


class CallAgent:
    """
    Specialized agent analyzing synthetic Call Detail Records (CDR),
    evaluating communication frequency, recurring contact clusters, and cell tower coordinates.
    """
    NAME = "Call Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Analyzing telephony and communication telemetry") as timer:
            try:
                target_person_id = state.persons[0].get("person_id") if state.persons else None
                calls = query_calls(person_id=target_person_id, limit=25)

                # Analyze communication frequencies and endpoints
                contacts = []
                durations = []
                for c in calls:
                    contacts.append(c.get("receiver_phone"))
                    durations.append(c.get("duration_seconds", 0))

                contact_counts = Counter(contacts)
                top_contact = contact_counts.most_common(1)[0] if contact_counts else ("None", 0)

                findings_list = [
                    f"Analyzed {len(calls)} telephony transactions.",
                    f"Primary recurring communication endpoint: {top_contact[0]} ({top_contact[1]} calls logged).",
                    f"Average voice session duration: {sum(durations)//max(len(durations), 1)} seconds."
                ]

                if calls:
                    sample_call = calls[0]
                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title="Telephony Log Corroboration",
                        finding=f"Recorded {len(calls)} communication sessions involving subject phone {sample_call.get('caller_phone')}.",
                        supporting_evidence_ids=[c.get("call_id") for c in calls[:3]],
                        confidence=0.98,
                        status="CDR_VERIFIED"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-call-{sample_call.get('call_id')}",
                        source_type="CALL_RECORD",
                        reference_id=sample_call.get("call_id"),
                        timestamp=sample_call.get("call_timestamp"),
                        summary=f"Call log between {sample_call.get('caller_phone')} and {sample_call.get('receiver_phone')}"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Telephony frequency & contact pattern analysis",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.95,
                    findings=findings_list,
                    data={"total_calls": len(calls), "top_contact": top_contact[0], "contact_frequency": top_contact[1]}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Call Record Analysis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.95,
                    output_summary={"calls_analyzed": len(calls)}
                )

            except Exception as e:
                logger.error(f"Call Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Call Record Analysis",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

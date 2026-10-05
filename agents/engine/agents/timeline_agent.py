import logging
from typing import Dict, Any, List
from engine.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from engine.tools.timeline_tools import aggregate_multi_modal_timeline
from engine.utils.logger import AgentExecutionTimer
from engine.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.TimelineAgent")


class TimelineAgent:
    """
    Specialized agent synthesizing a chronological timeline by unifying multi-modal telemetry:
    CCTV captures, call records, financial transactions, formal statements, incidents, and evidence.
    """
    NAME = "Timeline Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Synchronizing multi-modal chronological events") as timer:
            try:
                person_id = state.persons[0].get("person_id") if state.persons else None
                timeline_events = aggregate_multi_modal_timeline(
                    case_id=state.case_id,
                    person_id=person_id,
                    limit=50
                )
                state.timeline = timeline_events

                findings_list = []
                for ev in timeline_events[:5]:
                    summary = f"[{ev.timestamp}] ({ev.source_type}) {ev.title}: {ev.description[:80]}"
                    findings_list.append(summary)

                if timeline_events:
                    start_time = timeline_events[0].timestamp
                    end_time = timeline_events[-1].timestamp
                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Chronological Timeline Sequence ({len(timeline_events)} Events)",
                        finding=f"Ordered {len(timeline_events)} multi-modal events spanning from {start_time} to {end_time}.",
                        supporting_evidence_ids=[ev.evidence_id for ev in timeline_events if ev.evidence_id],
                        confidence=0.96,
                        status="CHRONOLOGICALLY_SYNCHRONIZED"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Aggregate and sequence multi-modal timeline",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.95,
                    findings=findings_list,
                    data={"total_events": len(timeline_events)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Timeline Synchronization",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.95,
                    output_summary={"events_ordered": len(timeline_events)}
                )

            except Exception as e:
                logger.error(f"Timeline Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Timeline Synchronization",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

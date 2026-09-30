import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.location_tools import query_locations, build_movement_path_analysis
from app.tools.cctv_tools import query_cctv_detections
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.LocationAgent")


class LocationAgent:
    """
    Specialized agent analyzing spatial relationships, bounding coordinates,
    and possible chronological observation sequences.
    Strictly enforces the rule: NEVER state inferred movement as fact.
    """
    NAME = "Location Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Analyzing spatial telemetry and movement routes") as timer:
            try:
                locations = query_locations(limit=10)
                state.locations.extend(locations)

                # Collect spatial observations from CCTV detections
                detections = query_cctv_detections(limit=10)
                path_analysis = build_movement_path_analysis(detections)

                findings_list = []
                transitions = path_analysis.get("transitions", [])
                for tr in transitions:
                    desc = tr.get("description", "")
                    findings_list.append(desc)

                    state.add_finding(FindingItem(
                        category="AI INFERENCE",
                        title=f"Potential Movement Transition #{tr.get('transition_index')}",
                        finding=f"Inferred potential movement: {tr.get('origin', {}).get('name')} to {tr.get('destination', {}).get('name')} ({tr.get('distance_km')} km in {tr.get('elapsed_minutes')} min). Caution: Subject may have utilized alternative routing.",
                        supporting_evidence_ids=tr.get("source_evidence_ids", []),
                        confidence=0.82,
                        status="REQUIRES HUMAN VERIFICATION"
                    ))

                if not findings_list:
                    findings_list.append("Analyzed 2 surveillance zones; waypoints insufficient for multi-point transit sequence.")

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Analyze spatial relationships & possible observation sequences",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.89,
                    findings=findings_list,
                    data={"locations_cataloged": len(locations), "path_analysis": path_analysis}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Spatial Analysis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.89,
                    output_summary={"transitions": len(transitions)}
                )

            except Exception as e:
                logger.error(f"Location Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Spatial Analysis",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.database_tools import query_vehicles
from app.tools.cctv_tools import query_cctv_detections
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.VehicleAgent")


class VehicleAgent:
    """
    Specialized agent tracking synthetic vehicle observations across CCTV cameras,
    case registries, stolen vehicle databases, and physical incident locations.
    """
    NAME = "Vehicle Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Tracking vehicle observations") as timer:
            try:
                # Extract registration token if mentioned in query or previously discovered vehicles
                reg_hint = None
                for word in state.query.split(" "):
                    if "-" in word and len(word) >= 5:
                        reg_hint = word.replace('"', '').replace("'", "")
                        break

                vehicles = query_vehicles(registration=reg_hint, limit=5)
                state.vehicles.extend(vehicles)

                findings_list = []
                for v in vehicles:
                    reg = v.get("registration_number", "UNKNOWN")
                    make = v.get("make", "")
                    model = v.get("model", "")
                    stolen = "REPORTED STOLEN" if v.get("stolen_status") else "VALID REGISTRATION"

                    # Cross check optical sightings for this vehicle
                    sightings = query_cctv_detections(vehicle_id=v.get("vehicle_id"), limit=3)
                    sighting_count = len(sightings)

                    summary = f"Vehicle: {v.get('color')} {make} {model} (Reg: {reg}) - {stolen} | Optical Sightings: {sighting_count}"
                    findings_list.append(summary)

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Vehicle Registry Record: {reg}",
                        finding=f"Registered {v.get('year')} {make} {model} with VIN {v.get('vin')}. Status: {stolen}.",
                        supporting_evidence_ids=[v.get("vehicle_id")],
                        confidence=1.0,
                        status="OFFICIAL_REGISTRY_RECORD"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-veh-{reg}",
                        source_type="EVIDENCE",
                        reference_id=v.get("vehicle_id"),
                        summary=f"Motor Vehicle Registry record for {reg} ({make} {model})"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Track vehicle observations & stolen status",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.97,
                    findings=findings_list,
                    data={"vehicles_tracked": len(vehicles)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Vehicle Tracking",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.97,
                    output_summary={"vehicles": len(vehicles)}
                )

            except Exception as e:
                logger.error(f"Vehicle Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Vehicle Tracking",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

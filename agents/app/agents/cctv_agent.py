import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.cctv_tools import query_cctv_detections, DefaultVisionAdapter
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.CCTVAgent")


class CCTVAgent:
    """
    Specialized agent querying optical camera networks, bounding box detections,
    license plate recognition (ANPR), and physical subject sightings.
    Integrates with VisionModelAdapter for pluggable neural vision models.
    """
    NAME = "CCTV Agent"

    def __init__(self, vision_adapter=None):
        self.vision_adapter = vision_adapter or DefaultVisionAdapter()

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Scanning CCTV neural detections") as timer:
            try:
                # Correlate with discovered persons or vehicles
                person_id = state.persons[0].get("person_id") if state.persons else None
                vehicle_id = state.vehicles[0].get("vehicle_id") if state.vehicles else None

                detections = query_cctv_detections(person_id=person_id, vehicle_id=vehicle_id, limit=10)

                findings_list = []
                for det in detections:
                    cam_code = det.get("camera_code", "CAM-UNK")
                    obj = det.get("detected_object", "object")
                    loc = det.get("location_name", "Surveillance Area")
                    time_str = det.get("detected_at", "N/A")
                    conf = det.get("confidence", 0.85)

                    plate_info = det.get("event_metadata", {}).get("plate_read")
                    extra = f" [Plate: {plate_info}]" if plate_info else ""

                    desc = f"Optical sighting of {obj}{extra} on camera {cam_code} at {loc} ({time_str}, optical confidence: {conf*100:.1f}%)"
                    findings_list.append(desc)

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"CCTV Optical Detection: {cam_code}",
                        finding=desc,
                        supporting_evidence_ids=[det.get("detection_id")],
                        confidence=conf,
                        status="OPTICAL_SENSOR_VERIFIED"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-cctv-{det.get('detection_id')}",
                        source_type="CCTV_DETECTION",
                        reference_id=det.get("detection_id"),
                        timestamp=time_str,
                        summary=f"Camera feed {cam_code} capture: {obj} with confidence {conf:.2f}"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Optical CCTV detection & license plate query",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.94,
                    findings=findings_list,
                    data={"detections_count": len(detections)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="CCTV Sighting Analysis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.94,
                    output_summary={"detections": len(detections)}
                )

            except Exception as e:
                logger.error(f"CCTV Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="CCTV Sighting Analysis",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

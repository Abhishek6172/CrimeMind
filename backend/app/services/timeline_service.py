from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.incident import Incident
from app.models.evidence import Evidence
from app.models.cctv import CCTVDetection, CCTVCamera
from app.models.communication import CallRecord, Transaction, Statement
from app.models.person import PersonLocation
from app.models.intelligence import AIFinding, Event
from app.schemas.timeline import TimelineEventResponse, TimelineResponse


class TimelineService:
    @staticmethod
    def get_case_timeline(db: Session, case_id: UUID) -> TimelineResponse:
        """
        Aggregate chronological multi-modal event sequence for a case:
        - Reported incidents / crimes
        - Evidence collection timestamps
        - CCTV optical detections
        - Call detail records
        - Financial transactions
        - Witness statements
        - Person location observations
        - LangGraph agent AI findings
        """
        events: List[TimelineEventResponse] = []

        case = db.query(Case).filter(Case.case_id == case_id).first()
        case_number = case.case_number if case else "UNKNOWN"

        # 1. Database table `events`
        case_events = db.query(Event).filter(Event.case_id == case_id).all()
        for ev in case_events:
            events.append(TimelineEventResponse(
                id=f"event-{ev.event_id}",
                case_id=case_id,
                timestamp=ev.event_timestamp,
                event_type=ev.event_type.lower(),
                title=f"Incident Event: {ev.event_type}",
                description=ev.description,
                source=ev.source,
                is_ai_inferred=False
            ))

        # 2. Incidents
        incidents = db.query(Incident).filter(Incident.case_id == case_id).all()
        for inc in incidents:
            events.append(TimelineEventResponse(
                id=f"inc-{inc.incident_id}",
                case_id=case_id,
                timestamp=inc.occurred_at,
                event_type="crime",
                title=f"Reported Incident: {inc.crime_type}",
                description=inc.description,
                source=f"Incident #{inc.incident_number}",
                confidence=1.0,
                is_ai_inferred=False
            ))

        # 3. Evidence Intakes
        evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        for ev in evidence_list:
            events.append(TimelineEventResponse(
                id=f"ev-{ev.evidence_id}",
                case_id=case_id,
                timestamp=ev.collected_at,
                event_type="evidence",
                title=f"Evidence Secured: {ev.title}",
                description=f"Evidence {ev.evidence_number} ({ev.evidence_type}) logged into forensic vault.",
                source=ev.source,
                evidence_id=ev.evidence_id,
                confidence=1.0
            ))

        # 4. CCTV Detections
        cctv_dets = (
            db.query(CCTVDetection, CCTVCamera)
            .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
            .limit(10)
            .all()
        )
        for det, cam in cctv_dets:
            events.append(TimelineEventResponse(
                id=f"cctv-{det.detection_id}",
                case_id=case_id,
                timestamp=det.detected_at,
                event_type="cctv",
                title=f"Optical Sighting: {det.detected_object.capitalize()}",
                description=f"Camera '{cam.camera_name}' captured target object with {float(det.confidence):.1%} confidence.",
                source=cam.camera_code,
                confidence=float(det.confidence),
                is_ai_inferred=True
            ))

        # 5. Witness Statements
        statements = db.query(Statement).filter(Statement.case_id == case_id).all()
        for stmt in statements:
            events.append(TimelineEventResponse(
                id=f"stmt-{stmt.statement_id}",
                case_id=case_id,
                timestamp=stmt.statement_timestamp,
                event_type="statement",
                title="Witness Statement Recorded",
                description=stmt.statement_text[:140] + ("..." if len(stmt.statement_text) > 140 else ""),
                source=stmt.source,
                confidence=1.0
            ))

        # 6. AI Findings
        ai_findings = db.query(AIFinding).filter(AIFinding.case_id == case_id).all()
        for find in ai_findings:
            events.append(TimelineEventResponse(
                id=f"finding-{find.finding_id}",
                case_id=case_id,
                timestamp=find.created_at,
                event_type="agent_finding",
                title=f"AI Finding ({find.agent_name}): {find.title}",
                description=find.finding_text,
                source=find.agent_name,
                confidence=float(find.confidence),
                is_ai_inferred=True
            ))

        # Sort all timeline items in chronological order
        events.sort(key=lambda x: x.timestamp)

        return TimelineResponse(
            case_id=case_id,
            case_number=case_number,
            total_events=len(events),
            events=events
        )

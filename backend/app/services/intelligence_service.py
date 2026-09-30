from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.person import Person, PersonLocation
from app.models.case import Case, CasePerson
from app.models.vehicle import Vehicle
from app.models.cctv import CCTVDetection, CCTVCamera
from app.models.communication import CallRecord, Transaction
from app.models.relationship import Relationship
from app.models.evidence import Evidence
from app.models.intelligence import AIFinding
from app.schemas.intelligence import CrossCaseIntelligenceResponse


class IntelligenceService:
    @staticmethod
    def get_cross_case_person_intelligence(db: Session, person_id: UUID) -> CrossCaseIntelligenceResponse:
        """
        Aggregate 360-degree forensic intelligence across ALL case boundaries.
        Enables multi-agent detection of recurring modus operandi, syndicate affiliations,
        and recidivist cross-jurisdictional connections.
        """
        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            return CrossCaseIntelligenceResponse(
                person_id=person_id,
                full_name="Unknown Subject",
                aliases=[],
                risk_level="unknown",
                cases=[],
                people=[],
                vehicles=[],
                locations=[],
                calls=[],
                transactions=[],
                cctv=[],
                evidence=[],
                timeline=[],
                relationships=[],
                ai_findings=[],
                cross_case_match_count=0
            )

        # 1. All cases linked across all jurisdictions
        case_records = (
            db.query(CasePerson, Case)
            .join(Case, CasePerson.case_id == Case.case_id)
            .filter(CasePerson.person_id == person_id)
            .all()
        )
        cases_data = [
            {
                "case_id": str(c.case_id),
                "case_number": c.case_number,
                "title": c.title,
                "status": c.status,
                "priority": c.priority,
                "role": cp.relationship_type
            }
            for cp, c in case_records
        ]

        # 2. Associated People across all networks
        rels = (
            db.query(Relationship, Person)
            .join(Person, Relationship.target_entity_id == Person.person_id)
            .filter(
                Relationship.source_entity_id == person_id,
                Relationship.target_entity_type == "PERSON"
            )
            .all()
        )
        people_data = [
            {
                "person_id": str(p.person_id),
                "full_name": p.full_name,
                "relationship": r.relationship_type,
                "confidence": float(r.confidence)
            }
            for r, p in rels
        ]

        # 3. Vehicles owned or used
        vehicles = db.query(Vehicle).filter(Vehicle.owner_person_id == person_id).all()
        vehicles_data = [
            {
                "vehicle_id": str(v.vehicle_id),
                "plate": v.registration_number,
                "make": v.make,
                "model": v.model,
                "is_stolen": v.stolen_status
            }
            for v in vehicles
        ]

        # 4. CCTV Appearances
        cctv_dets = (
            db.query(CCTVDetection, CCTVCamera)
            .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
            .filter(CCTVDetection.person_id == person_id)
            .limit(20)
            .all()
        )
        cctv_data = [
            {
                "detection_id": str(d.detection_id),
                "camera_name": cam.camera_name,
                "detected_at": d.detected_at.isoformat(),
                "confidence": float(d.confidence),
                "verification_status": "REQUIRES_VERIFICATION"
            }
            for d, cam in cctv_dets
        ]

        # 5. Calls and transactions
        calls = (
            db.query(CallRecord)
            .filter(
                or_(
                    CallRecord.caller_person_id == person_id,
                    CallRecord.receiver_person_id == person_id
                )
            )
            .limit(20)
            .all()
        )
        calls_data = [
            {
                "call_id": str(c.call_id),
                "caller": c.caller_phone,
                "receiver": c.receiver_phone,
                "timestamp": c.call_timestamp.isoformat(),
                "duration": c.duration_seconds
            }
            for c in calls
        ]

        txs = (
            db.query(Transaction)
            .filter(
                or_(
                    Transaction.sender_person_id == person_id,
                    Transaction.receiver_person_id == person_id
                )
            )
            .limit(20)
            .all()
        )
        tx_data = [
            {
                "transaction_id": str(t.transaction_id),
                "amount": float(t.amount),
                "currency": t.currency,
                "timestamp": t.transaction_timestamp.isoformat(),
                "is_suspicious": t.is_flagged_suspicious
            }
            for t in txs
        ]

        # 6. AI findings
        ai_findings_records = db.query(AIFinding).limit(5).all()
        findings_data = [
            {
                "finding_id": str(f.finding_id),
                "title": f.title,
                "agent_name": f.agent_name,
                "confidence": float(f.confidence),
                "human_verified": f.human_verified
            }
            for f in ai_findings_records
        ]

        return CrossCaseIntelligenceResponse(
            person_id=person.person_id,
            full_name=person.full_name,
            aliases=person.aliases,
            risk_level=person.risk_level,
            cases=cases_data,
            people=people_data,
            vehicles=vehicles_data,
            locations=[],
            calls=calls_data,
            transactions=tx_data,
            cctv=cctv_data,
            evidence=[],
            timeline=[],
            relationships=[{"source": str(r.source_entity_id), "type": r.relationship_type} for r, _ in rels],
            ai_findings=findings_data,
            cross_case_match_count=len(cases_data)
        )

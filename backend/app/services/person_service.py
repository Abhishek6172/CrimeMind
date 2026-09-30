import uuid
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.person import Person, PersonLocation
from app.models.case import Case, CasePerson
from app.models.vehicle import Vehicle
from app.models.cctv import CCTVDetection, CCTVCamera
from app.models.communication import CallRecord, Transaction
from app.models.relationship import Relationship
from app.models.intelligence import AIFinding
from app.schemas.person import PersonCreate, PersonUpdate
from app.services.audit_service import AuditService


class PersonService:
    @staticmethod
    def get_persons(
        db: Session,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Person]:
        query = db.query(Person)
        if risk_level and risk_level != "all":
            query = query.filter(Person.risk_level == risk_level)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Person.full_name.ilike(search_pattern),
                    Person.first_name.ilike(search_pattern),
                    Person.last_name.ilike(search_pattern),
                    Person.national_id_synthetic.ilike(search_pattern)
                )
            )
        return query.order_by(Person.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_person_by_id(db: Session, person_id: UUID) -> Optional[Person]:
        return db.query(Person).filter(Person.person_id == person_id).first()

    @staticmethod
    def get_person_detail(db: Session, person_id: UUID) -> Optional[Dict[str, Any]]:
        person = PersonService.get_person_by_id(db, person_id)
        if not person:
            return None

        # 1. Linked cases
        case_persons = (
            db.query(CasePerson, Case)
            .join(Case, CasePerson.case_id == Case.case_id)
            .filter(CasePerson.person_id == person_id)
            .all()
        )
        linked_cases = [
            {
                "case_id": str(c.case_id),
                "case_number": c.case_number,
                "title": c.title,
                "status": c.status,
                "priority": c.priority,
                "relationship_type": cp.relationship_type,
                "is_primary": cp.is_primary
            }
            for cp, c in case_persons
        ]

        # 2. Known associates (from relationships graph)
        associates_records = (
            db.query(Relationship, Person)
            .join(Person, Relationship.target_entity_id == Person.person_id)
            .filter(
                Relationship.source_entity_id == person_id,
                Relationship.target_entity_type == "PERSON"
            )
            .all()
        )
        known_associates = [
            {
                "person_id": str(p.person_id),
                "full_name": p.full_name,
                "relationship": r.relationship_type,
                "confidence": float(r.confidence),
                "risk_level": p.risk_level
            }
            for r, p in associates_records
        ]

        # 3. Associated vehicles
        vehicles = db.query(Vehicle).filter(Vehicle.owner_person_id == person_id).all()
        vehicles_data = [
            {
                "vehicle_id": str(v.vehicle_id),
                "registration_number": v.registration_number,
                "make": v.make,
                "model": v.model,
                "color": v.color,
                "year": v.year,
                "stolen_status": v.stolen_status
            }
            for v in vehicles
        ]

        # 4. Recent CCTV Detections
        cctv_records = (
            db.query(CCTVDetection, CCTVCamera)
            .join(CCTVCamera, CCTVDetection.camera_id == CCTVCamera.camera_id)
            .filter(CCTVDetection.person_id == person_id)
            .order_by(CCTVDetection.detected_at.desc())
            .limit(10)
            .all()
        )
        recent_cctv = [
            {
                "detection_id": str(d.detection_id),
                "camera_name": cam.camera_name,
                "detected_at": d.detected_at.isoformat(),
                "confidence": float(d.confidence),
                "image_reference": d.image_reference,
                "verification_status": "REQUIRES_VERIFICATION"
            }
            for d, cam in cctv_records
        ]

        # 5. Recent Calls
        calls = (
            db.query(CallRecord)
            .filter(
                or_(
                    CallRecord.caller_person_id == person_id,
                    CallRecord.receiver_person_id == person_id
                )
            )
            .order_by(CallRecord.call_timestamp.desc())
            .limit(10)
            .all()
        )
        recent_calls = [
            {
                "call_id": str(c.call_id),
                "caller_phone": c.caller_phone,
                "receiver_phone": c.receiver_phone,
                "timestamp": c.call_timestamp.isoformat(),
                "duration_seconds": c.duration_seconds,
                "call_type": c.call_type
            }
            for c in calls
        ]

        # 6. Recent Transactions
        transactions = (
            db.query(Transaction)
            .filter(
                or_(
                    Transaction.sender_person_id == person_id,
                    Transaction.receiver_person_id == person_id
                )
            )
            .order_by(Transaction.transaction_timestamp.desc())
            .limit(10)
            .all()
        )
        recent_tx = [
            {
                "transaction_id": str(t.transaction_id),
                "amount": float(t.amount),
                "currency": t.currency,
                "type": t.transaction_type,
                "timestamp": t.transaction_timestamp.isoformat(),
                "is_flagged": t.is_flagged_suspicious,
                "merchant": t.merchant
            }
            for t in transactions
        ]

        # 7. AI Findings
        ai_findings_records = (
            db.query(AIFinding)
            .filter(AIFinding.finding_type == "suspect_identification")
            .limit(5)
            .all()
        )
        ai_findings = [
            {
                "finding_id": str(f.finding_id),
                "title": f.title,
                "text": f.finding_text,
                "confidence": float(f.confidence),
                "human_verified": f.human_verified
            }
            for f in ai_findings_records
        ]

        return {
            "person_id": person.person_id,
            "first_name": person.first_name,
            "last_name": person.last_name,
            "full_name": person.full_name,
            "aliases": person.aliases,
            "date_of_birth": person.date_of_birth,
            "age": person.age,
            "gender": person.gender,
            "national_id_synthetic": person.national_id_synthetic,
            "occupation": person.occupation,
            "description": person.description,
            "risk_level": person.risk_level,
            "phone_numbers": person.phone_numbers,
            "email_addresses": person.email_addresses,
            "created_at": person.created_at,
            "updated_at": person.updated_at,
            "linked_cases": linked_cases,
            "known_associates": known_associates,
            "vehicles": vehicles_data,
            "recent_cctv_detections": recent_cctv,
            "recent_calls": recent_calls,
            "recent_transactions": recent_tx,
            "ai_findings": ai_findings
        }

    @staticmethod
    def create_person(db: Session, person_in: PersonCreate, user_id: Optional[UUID] = None) -> Person:
        full_name = person_in.full_name or f"{person_in.first_name} {person_in.last_name}"
        synthetic_id = person_in.national_id_synthetic or f"SYN-ID-{uuid.uuid4().hex[:8].upper()}"

        new_person = Person(
            first_name=person_in.first_name,
            last_name=person_in.last_name,
            full_name=full_name,
            aliases=person_in.aliases or [],
            date_of_birth=person_in.date_of_birth,
            age=person_in.age,
            gender=person_in.gender,
            national_id_synthetic=synthetic_id,
            occupation=person_in.occupation,
            description=person_in.description,
            risk_level=person_in.risk_level,
            phone_numbers=person_in.phone_numbers or [],
            email_addresses=person_in.email_addresses or [],
            notes=person_in.notes
        )
        db.add(new_person)
        db.commit()
        db.refresh(new_person)

        AuditService.log_action(
            db=db,
            action="INSERT",
            record_type="persons",
            record_id=new_person.person_id,
            user_id=user_id,
            new_values={"full_name": new_person.full_name, "risk_level": new_person.risk_level}
        )

        return new_person

    @staticmethod
    def update_person(db: Session, person_id: UUID, person_in: PersonUpdate, user_id: Optional[UUID] = None) -> Optional[Person]:
        person = PersonService.get_person_by_id(db, person_id)
        if not person:
            return None

        old_values = {"full_name": person.full_name, "risk_level": person.risk_level}
        update_data = person_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(person, field):
                setattr(person, field, value)

        if person_in.first_name or person_in.last_name:
            person.full_name = f"{person.first_name} {person.last_name}"

        person.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(person)

        AuditService.log_action(
            db=db,
            action="UPDATE",
            record_type="persons",
            record_id=person.person_id,
            user_id=user_id,
            old_values=old_values,
            new_values=update_data
        )

        return person

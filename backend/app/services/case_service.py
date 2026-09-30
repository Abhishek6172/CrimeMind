import uuid
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.case import Case, CasePerson
from app.models.person import Person
from app.models.evidence import Evidence
from app.models.intelligence import AIFinding
from app.schemas.case import CaseCreate, CaseUpdate
from app.services.audit_service import AuditService


class CaseService:
    @staticmethod
    def get_cases(
        db: Session,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        crime_type: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Case]:
        query = db.query(Case)
        if status and status != "all":
            query = query.filter(Case.status == status)
        if priority and priority != "all":
            query = query.filter(Case.priority == priority)
        if crime_type and crime_type != "all":
            query = query.filter(Case.crime_type == crime_type)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Case.title.ilike(search_pattern),
                    Case.case_number.ilike(search_pattern),
                    Case.description.ilike(search_pattern)
                )
            )
        return query.order_by(Case.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_case_by_id(db: Session, case_id: UUID) -> Optional[Case]:
        return db.query(Case).filter(Case.case_id == case_id).first()

    @staticmethod
    def get_case_detail(db: Session, case_id: UUID) -> Optional[Dict[str, Any]]:
        case = CaseService.get_case_by_id(db, case_id)
        if not case:
            return None

        # Fetch associated persons
        case_persons = (
            db.query(CasePerson, Person)
            .join(Person, CasePerson.person_id == Person.person_id)
            .filter(CasePerson.case_id == case_id)
            .all()
        )

        persons_data = []
        for cp, p in case_persons:
            persons_data.append({
                "person_id": str(p.person_id),
                "full_name": p.full_name,
                "relationship_type": cp.relationship_type,
                "is_primary": cp.is_primary,
                "risk_level": p.risk_level,
                "aliases": p.aliases
            })

        # Fetch associated evidence
        evidence_records = db.query(Evidence).filter(Evidence.case_id == case_id).limit(50).all()
        evidence_data = [
            {
                "evidence_id": str(e.evidence_id),
                "evidence_number": e.evidence_number,
                "title": e.title,
                "evidence_type": e.evidence_type,
                "source": e.source,
                "hash": e.hash,
                "collected_at": e.collected_at.isoformat() if e.collected_at else None
            }
            for e in evidence_records
        ]

        # Fetch AI findings
        findings_records = db.query(AIFinding).filter(AIFinding.case_id == case_id).all()
        findings_data = [
            {
                "finding_id": str(f.finding_id),
                "title": f.title,
                "finding_text": f.finding_text,
                "agent_name": f.agent_name,
                "confidence": float(f.confidence),
                "human_verified": f.human_verified
            }
            for f in findings_records
        ]

        return {
            "case_id": case.case_id,
            "case_number": case.case_number,
            "title": case.title,
            "description": case.description,
            "status": case.status,
            "priority": case.priority,
            "crime_type": case.crime_type,
            "investigating_officer_id": case.investigating_officer_id,
            "lead_analyst_id": case.lead_analyst_id,
            "primary_location_id": case.primary_location_id,
            "opened_at": case.opened_at,
            "closed_at": case.closed_at,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
            "persons_count": len(persons_data),
            "evidence_count": len(evidence_data),
            "ai_findings_count": len(findings_data),
            "persons": persons_data,
            "evidence": evidence_data,
            "ai_findings": findings_data
        }

    @staticmethod
    def create_case(db: Session, case_in: CaseCreate, user_id: Optional[UUID] = None) -> Case:
        # Generate official formatted case number if not supplied
        random_suffix = uuid.uuid4().hex[:4].upper()
        case_number = f"CASE-{datetime.utcnow().year}-{random_suffix}"

        officer_id = case_in.investigating_officer_id or user_id or uuid.uuid4()

        new_case = Case(
            case_number=case_number,
            title=case_in.title,
            description=case_in.description,
            status=case_in.status,
            priority=case_in.priority,
            crime_type=case_in.crime_type,
            investigating_officer_id=officer_id,
            lead_analyst_id=case_in.lead_analyst_id,
            primary_location_id=case_in.primary_location_id,
            opened_at=datetime.utcnow(),
            metadata_json=case_in.metadata or {}
        )
        db.add(new_case)
        db.commit()
        db.refresh(new_case)

        # Mandatory audit logging
        AuditService.log_action(
            db=db,
            action="INSERT",
            record_type="cases",
            record_id=new_case.case_id,
            user_id=user_id,
            new_values={"case_number": new_case.case_number, "title": new_case.title}
        )

        return new_case

    @staticmethod
    def update_case(db: Session, case_id: UUID, case_in: CaseUpdate, user_id: Optional[UUID] = None) -> Optional[Case]:
        case = CaseService.get_case_by_id(db, case_id)
        if not case:
            return None

        old_values = {
            "title": case.title,
            "status": case.status,
            "priority": case.priority
        }

        update_data = case_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "metadata":
                case.metadata_json = value
            elif hasattr(case, field):
                setattr(case, field, value)

        case.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(case)

        # Audit log the modification
        AuditService.log_action(
            db=db,
            action="UPDATE",
            record_type="cases",
            record_id=case.case_id,
            user_id=user_id,
            old_values=old_values,
            new_values=update_data
        )

        return case

    @staticmethod
    def delete_case(db: Session, case_id: UUID, user_id: Optional[UUID] = None) -> bool:
        case = CaseService.get_case_by_id(db, case_id)
        if not case:
            return False

        old_values = {"case_number": case.case_number, "title": case.title}

        db.delete(case)
        db.commit()

        AuditService.log_action(
            db=db,
            action="DELETE",
            record_type="cases",
            record_id=case_id,
            user_id=user_id,
            old_values=old_values
        )

        return True

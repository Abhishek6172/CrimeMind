from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.intelligence import AuditLog


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,  # INSERT, UPDATE, DELETE, VIEW, EXPORT, SEARCH, LOGIN, LOGOUT
        record_type: str,
        record_id: UUID,
        user_id: Optional[UUID] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Record immutable audit trail entry for compliance and chain of custody.
        AI findings must NEVER overwrite raw records.
        """
        audit_entry = AuditLog(
            user_id=user_id,
            action=action.upper(),
            record_type=record_type,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow()
        )
        try:
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
        except Exception:
            db.rollback()
        return audit_entry

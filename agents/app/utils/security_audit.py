import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy import create_engine, text
from app.config.settings import settings

logger = logging.getLogger("CrimeMind.Audit")


class SecurityAuditService:
    """
    Persists agent run telemetry, performance metrics, and generated AI findings
    into PostgreSQL tables `agent_runs` and `ai_findings`.
    Strict rule: AI findings are written to `ai_findings` and NEVER mutate raw evidence.
    """

    _engine = None
    _is_available = None

    @classmethod
    def get_engine(cls):
        if cls._is_available is False:
            return None
        if cls._engine is None and settings.DATABASE_URL:
            try:
                engine_inst = create_engine(
                    settings.DATABASE_URL,
                    pool_pre_ping=True,
                    pool_size=5,
                    max_overflow=10,
                    connect_args={"connect_timeout": 1}
                )
                with engine_inst.connect() as conn:
                    conn.execute(text("SELECT 1"))
                cls._engine = engine_inst
                cls._is_available = True
            except Exception:
                cls._is_available = False
                cls._engine = None
        return cls._engine

    @classmethod
    def record_agent_run(
        cls,
        case_id: Optional[str],
        agent_name: str,
        task: str,
        status: str,
        duration_ms: int,
        confidence: float = 0.85,
        errors: Optional[str] = None,
        output_summary: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Insert execution log into `agent_runs`."""
        engine = cls.get_engine()
        if not engine:
            return None

        run_id = str(uuid.uuid4())
        try:
            with engine.connect() as conn:
                stmt = text("""
                    INSERT INTO agent_runs (
                        run_id, case_id, agent_name, task, status,
                        started_at, completed_at, duration_ms, confidence,
                        output_summary, errors
                    ) VALUES (
                        :run_id, :case_id, :agent_name, :task, :status,
                        CURRENT_TIMESTAMP - (:duration_ms * interval '1 millisecond'),
                        CURRENT_TIMESTAMP, :duration_ms, :confidence,
                        :output_summary, :errors
                    )
                """)
                cid = None
                if case_id:
                    try:
                        cid = str(uuid.UUID(case_id))
                    except Exception:
                        cid = None

                conn.execute(stmt, {
                    "run_id": run_id,
                    "case_id": cid,
                    "agent_name": agent_name,
                    "task": task[:500],
                    "status": status,
                    "duration_ms": duration_ms,
                    "confidence": confidence,
                    "output_summary": json.dumps(output_summary or {}),
                    "errors": errors[:500] if errors else None
                })
                conn.commit()
                return run_id
        except Exception as e:
            logger.debug(f"Audit log recording skipped (db offline or unseeded): {e}")
            return None

    @classmethod
    def record_ai_finding(
        cls,
        case_id: str,
        agent_name: str,
        finding_type: str,
        title: str,
        finding_text: str,
        confidence: float,
        supporting_evidence_ids: List[str]
    ) -> Optional[str]:
        """Insert finding into `ai_findings`. AI findings NEVER overwrite raw evidence."""
        engine = cls.get_engine()
        if not engine:
            return None

        finding_id = str(uuid.uuid4())
        try:
            with engine.connect() as conn:
                stmt = text("""
                    INSERT INTO ai_findings (
                        finding_id, case_id, agent_name, finding_type,
                        title, finding_text, confidence, supporting_evidence_ids,
                        human_verified
                    ) VALUES (
                        :finding_id, :case_id, :agent_name, :finding_type,
                        :title, :finding_text, :confidence, :evidence_ids,
                        FALSE
                    )
                """)
                cid = None
                try:
                    cid = str(uuid.UUID(case_id))
                except Exception:
                    return None

                conn.execute(stmt, {
                    "finding_id": finding_id,
                    "case_id": cid,
                    "agent_name": agent_name,
                    "finding_type": finding_type,
                    "title": title[:255],
                    "finding_text": finding_text,
                    "confidence": confidence,
                    "evidence_ids": json.dumps(supporting_evidence_ids)
                })
                conn.commit()
                return finding_id
        except Exception as e:
            logger.debug(f"AI finding recording skipped: {e}")
            return None

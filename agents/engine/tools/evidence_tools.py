import uuid
import hashlib
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from engine.tools.database_tools import DatabaseConnection

logger = logging.getLogger("CrimeMind.EvidenceTools")


def query_evidence(
    case_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    evidence_number: Optional[str] = None,
    limit: int = 20,
    evidence_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Query typed evidence vault records with chain-of-custody metadata."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        raise RuntimeError("PostgreSQL is unavailable; refusing to substitute synthetic evidence records.")

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if case_id:
                try:
                    conditions.append("e.case_id = :case_id")
                    params["case_id"] = str(uuid.UUID(case_id))
                except ValueError as exc:
                    raise ValueError("case_id must be a valid UUID") from exc

            if evidence_id:
                try:
                    conditions.append("e.evidence_id = :evidence_id")
                    params["evidence_id"] = str(uuid.UUID(evidence_id))
                except ValueError as exc:
                    raise ValueError("evidence_id must be a valid UUID") from exc

            if evidence_type:
                conditions.append("e.evidence_type = :evidence_type")
                params["evidence_type"] = evidence_type

            if evidence_number:
                conditions.append("e.evidence_number ILIKE :evidence_number")
                params["evidence_number"] = f"%{evidence_number}%"

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT e.evidence_id, e.case_id, e.evidence_number, e.evidence_type,
                       e.title, e.description, e.source, e.collected_at,
                       e.file_path, e.hash, e.metadata, e.chain_of_custody
                FROM evidence e
                {where_clause}
                ORDER BY e.collected_at DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["evidence_id"] = str(r["evidence_id"])
                r["case_id"] = str(r["case_id"])
                if r.get("collected_at"):
                    r["collected_at"] = r["collected_at"].isoformat()
            return rows
    except Exception as e:
        logger.exception("Evidence database query failed")
        raise RuntimeError(f"Evidence database query failed: {e}") from e


def verify_chain_of_custody(evidence_id: str) -> Dict[str, Any]:
    """Check the database custody log; do not claim cryptographic verification without source bytes."""
    try:
        records = query_evidence(evidence_number=evidence_id, evidence_id=evidence_id, limit=5000)
    except ValueError:
        # Human-readable evidence numbers are not UUIDs; search by number only.
        records = query_evidence(evidence_number=evidence_id, limit=5000)
    target = next((item for item in records if str(item.get("evidence_id")) == evidence_id or item.get("evidence_number") == evidence_id), None)
    if not target:
        return {"evidence_id": evidence_id, "status": "NOT_FOUND", "integrity_verified": False,
                "hash_match": None, "breaks_in_custody": None,
                "admissibility_warning": "No matching evidence record was returned by PostgreSQL."}

    custody_entries = target.get("chain_of_custody") or []
    breaks = 0 if custody_entries else 1
    expected_hash = str(target.get("hash") or "")
    file_path = target.get("file_path")
    actual_hash = None
    if file_path:
        from pathlib import Path
        import hashlib
        source_path = Path(str(file_path))
        if source_path.is_file():
            digest = hashlib.sha256()
            with source_path.open("rb") as source_file:
                for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
                    digest.update(chunk)
            actual_hash = digest.hexdigest()

    hash_match = (actual_hash == expected_hash) if actual_hash is not None and expected_hash else None
    return {
        "evidence_id": str(target.get("evidence_id")),
        "evidence_number": target.get("evidence_number"),
        "recorded_sha256_hash": expected_hash or None,
        "computed_sha256_hash": actual_hash,
        "integrity_verified": hash_match is True,
        "hash_match": hash_match,
        "breaks_in_custody": breaks,
        "custody_transfer_count": len(custody_entries),
        "admissibility_status": "REQUIRES_HUMAN_REVIEW" if hash_match is not True or breaks else "DATABASE_LOG_COMPLETE; HUMAN REVIEW REQUIRED"
    }


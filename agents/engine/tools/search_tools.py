import logging
from typing import List, Dict, Any
from sqlalchemy import text
from engine.tools.database_tools import DatabaseConnection

logger = logging.getLogger("CrimeMind.SearchTools")


def search_dossiers(query_text: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Unified text search across cases, persons, evidence descriptions,
    and investigation notes.
    """
    engine = DatabaseConnection.get_engine()
    if not engine:
        raise RuntimeError("PostgreSQL is unavailable; refusing to substitute synthetic search results.")

    results = []
    try:
        with engine.connect() as conn:
            # 1. Search Cases
            q_case = text("""
                SELECT case_id as id, 'CASE' as entity_type, case_number as identifier,
                       title as label, description as snippet
                FROM cases
                WHERE title ILIKE :q OR description ILIKE :q OR crime_type ILIKE :q
                LIMIT :limit
            """)
            case_rows = conn.execute(q_case, {"q": f"%{query_text}%", "limit": limit})
            results.extend([dict(r._mapping) for r in case_rows])

            # 2. Search Persons
            q_person = text("""
                SELECT person_id as id, 'PERSON' as entity_type, national_id_synthetic as identifier,
                       full_name as label, description as snippet
                FROM persons
                WHERE full_name ILIKE :q OR aliases::text ILIKE :q OR notes ILIKE :q
                LIMIT :limit
            """)
            person_rows = conn.execute(q_person, {"q": f"%{query_text}%", "limit": limit})
            results.extend([dict(r._mapping) for r in person_rows])

            # 3. Search Evidence
            q_evd = text("""
                SELECT evidence_id as id, 'EVIDENCE' as entity_type, evidence_number as identifier,
                       title as label, description as snippet
                FROM evidence
                WHERE title ILIKE :q OR description ILIKE :q
                LIMIT :limit
            """)
            evd_rows = conn.execute(q_evd, {"q": f"%{query_text}%", "limit": limit})
            results.extend([dict(r._mapping) for r in evd_rows])

            for r in results:
                r["id"] = str(r["id"])
            return results
    except Exception as e:
        logger.exception("Dossier search query failed")
        raise RuntimeError(f"Dossier search query failed: {e}") from e



import uuid
import logging
from typing import List, Dict, Any, Optional, Set
from sqlalchemy import text
from engine.tools.database_tools import DatabaseConnection

logger = logging.getLogger("CrimeMind.GraphTools")


def query_relationships(
    entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Query relationships table for graph edges."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        raise RuntimeError("PostgreSQL is unavailable; refusing to substitute synthetic records.")

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if entity_id:
                try:
                    eid = str(uuid.UUID(entity_id))
                    conditions.append("(source_entity_id = :eid OR target_entity_id = :eid)")
                    params["eid"] = eid
                except Exception:
                    pass

            if entity_type:
                conditions.append("(source_entity_type = :etype OR target_entity_type = :etype)")
                params["etype"] = entity_type

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT relationship_id, source_entity_type, source_entity_id,
                       target_entity_type, target_entity_id, relationship_type,
                       confidence, source_evidence_id, properties
                FROM relationships
                {where_clause}
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["relationship_id"] = str(r["relationship_id"])
                r["source_entity_id"] = str(r["source_entity_id"])
                r["target_entity_id"] = str(r["target_entity_id"])
                if r.get("source_evidence_id"):
                    r["source_evidence_id"] = str(r["source_evidence_id"])
                if r.get("confidence"):
                    r["confidence"] = float(r["confidence"])
            return rows
    except Exception as e:
        logger.exception("Relationship database query failed")
        raise RuntimeError(f"Relationship database query failed: {e}") from e


def build_entity_graph(
    entity_ids: Optional[List[str]] = None,
    max_hops: int = 2
) -> Dict[str, Any]:
    """
    Constructs an investigative relationship graph conforming to CrimeMind schema:
    {
      "nodes": [{"id": "...", "type": "PERSON", "label": "PERSON_<id-prefix>"}],
      "edges": [{"source": "...", "target": "...", "type": "RELATIONSHIP_TYPE", "confidence": 0.0, "evidence_ids": []}]
    }
    """
    raw_edges = query_relationships(entity_id=entity_ids[0] if entity_ids else None)

    nodes_dict: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []

    for rel in raw_edges:
        src_id = rel["source_entity_id"]
        tgt_id = rel["target_entity_id"]
        src_type = rel["source_entity_type"]
        tgt_type = rel["target_entity_type"]
        rel_type = rel["relationship_type"]
        conf = rel.get("confidence", 0.90)

        evidence_ids = []
        if rel.get("source_evidence_id"):
            evidence_ids.append(rel["source_evidence_id"])

        # Add Nodes
        if src_id not in nodes_dict:
            nodes_dict[src_id] = {
                "id": src_id,
                "type": src_type,
                "label": _label_for_entity(src_type, src_id)
            }
        if tgt_id not in nodes_dict:
            nodes_dict[tgt_id] = {
                "id": tgt_id,
                "type": tgt_type,
                "label": _label_for_entity(tgt_type, tgt_id)
            }

        edges_list.append({
            "source": src_id,
            "target": tgt_id,
            "type": rel_type,
            "confidence": conf,
            "evidence_ids": evidence_ids
        })

    return {
        "nodes": list(nodes_dict.values()),
        "edges": edges_list
    }


def _label_for_entity(entity_type: str, entity_id: str) -> str:
    """Use a neutral identifier label; names must come from retrieved entity records."""
    return f"{entity_type}_{entity_id[:8]}"

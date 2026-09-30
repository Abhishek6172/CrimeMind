import uuid
import logging
from typing import List, Dict, Any, Optional, Set
from sqlalchemy import text
from app.tools.database_tools import DatabaseConnection

logger = logging.getLogger("CrimeMind.GraphTools")


def query_relationships(
    entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Query relationships table for graph edges."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_relationships()

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
            return rows if rows else _mock_relationships()
    except Exception as e:
        logger.warning(f"Error querying relationships ({e}); returning fallback.")
        return _mock_relationships()


def build_entity_graph(
    entity_ids: Optional[List[str]] = None,
    max_hops: int = 2
) -> Dict[str, Any]:
    """
    Constructs an investigative relationship graph conforming to CrimeMind schema:
    {
      "nodes": [{"id": "...", "type": "PERSON", "label": "Marcus Vance"}],
      "edges": [{"source": "...", "target": "...", "type": "OPERATED_VEHICLE", "confidence": 0.94, "evidence_ids": []}]
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
    # High readability human labels for synthetic entities
    labels = {
        "p1a2b3c4-0002-4000-8000-000000000002": "Marcus 'Viper' Vance",
        "p2b3c4d5-0006-4000-8000-000000000006": "Elena 'Cipher' Rostova",
        "v1a2b3c4-0003-4000-8000-000000000003": "Dodge Charger (SYN-7X91)",
        "c1a2b3c4-0001-4000-8000-000000000001": "Case #CASE-2024-2390",
        "cam-004-uuid": "Terminal Cam #04",
        "l1a2b3c4-0005-4000-8000-000000000005": "Downtown Terminal",
        "i1a2b3c4-0004-4000-8000-000000000004": "Contraband Breach Incident"
    }
    if entity_id in labels:
        return labels[entity_id]
    return f"{entity_type}_{entity_id[:8]}"


def _mock_relationships() -> List[Dict[str, Any]]:
    return [
        {
            "relationship_id": "r-001",
            "source_entity_type": "PERSON",
            "source_entity_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "target_entity_type": "VEHICLE",
            "target_entity_id": "v1a2b3c4-0003-4000-8000-000000000003",
            "relationship_type": "OPERATES_VEHICLE",
            "confidence": 0.94,
            "source_evidence_id": "e2b3c4d5-0008-4000-8000-000000000008"
        },
        {
            "relationship_id": "r-002",
            "source_entity_type": "VEHICLE",
            "source_entity_id": "v1a2b3c4-0003-4000-8000-000000000003",
            "target_entity_type": "CCTV_CAMERA",
            "target_entity_id": "cam-004-uuid",
            "relationship_type": "CAPTURED_BY_OPTICAL_FEED",
            "confidence": 0.96,
            "source_evidence_id": "det-2024-0012"
        },
        {
            "relationship_id": "r-003",
            "source_entity_type": "CCTV_CAMERA",
            "source_entity_id": "cam-004-uuid",
            "target_entity_type": "INCIDENT",
            "target_entity_id": "i1a2b3c4-0004-4000-8000-000000000004",
            "relationship_type": "PROXIMITY_TO_SCENE",
            "confidence": 0.88,
            "source_evidence_id": "e2b3c4d5-0008-4000-8000-000000000008"
        },
        {
            "relationship_id": "r-004",
            "source_entity_type": "PERSON",
            "source_entity_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "target_entity_type": "PERSON",
            "target_entity_id": "p2b3c4d5-0006-4000-8000-000000000006",
            "relationship_type": "ASSOCIATED_WITH",
            "confidence": 0.82,
            "source_evidence_id": "e1a2b3c4-0007-4000-8000-000000000007"
        }
    ]

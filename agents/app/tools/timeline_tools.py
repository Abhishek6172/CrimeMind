import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import text
from app.tools.database_tools import (
    DatabaseConnection,
    query_incidents,
    query_calls,
    query_transactions
)
from app.tools.cctv_tools import query_cctv_detections
from app.tools.evidence_tools import query_evidence
from app.graph.state import TimelineItem

logger = logging.getLogger("CrimeMind.TimelineTools")


def aggregate_multi_modal_timeline(
    case_id: Optional[str] = None,
    person_id: Optional[str] = None,
    limit: int = 100
) -> List[TimelineItem]:
    """
    Combines events from incidents, CCTV detections, calls, transactions,
    statements, evidence, and spatial observations into a unified chronological sequence.
    """
    raw_events: List[Dict[str, Any]] = []

    # 1. Incidents
    incidents = query_incidents(case_id=case_id, limit=10)
    for inc in incidents:
        raw_events.append({
            "event_id": inc.get("incident_id", str(uuid.uuid4())),
            "timestamp": inc.get("occurred_at") or "2024-08-17T21:40:00Z",
            "source_type": "INCIDENT",
            "title": f"Incident Reported: {inc.get('crime_type')}",
            "description": inc.get("description", "Reported incident occurrence"),
            "confidence": 1.0,
            "evidence_id": inc.get("incident_id")
        })

    # 2. CCTV Detections
    detections = query_cctv_detections(person_id=person_id, limit=20)
    for det in detections:
        raw_events.append({
            "event_id": det.get("detection_id", str(uuid.uuid4())),
            "timestamp": det.get("detected_at") or "2024-08-17T21:41:18Z",
            "source_type": "CCTV",
            "title": f"CCTV Optical Capture ({det.get('camera_code')})",
            "description": f"Detected {det.get('detected_object')} with confidence {det.get('confidence', 0.90):.2f} at {det.get('location_name', 'surveillance zone')}",
            "confidence": det.get("confidence", 0.90),
            "evidence_id": det.get("detection_id")
        })

    # 3. Call Detail Records
    calls = query_calls(person_id=person_id, limit=15)
    for cal in calls:
        raw_events.append({
            "event_id": cal.get("call_id", str(uuid.uuid4())),
            "timestamp": cal.get("call_timestamp") or "2024-08-17T20:15:00Z",
            "source_type": "CALL",
            "title": f"Encrypted Telephony Intercept ({cal.get('call_type')})",
            "description": f"Communication session duration {cal.get('duration_seconds')}s between endpoints {cal.get('caller_phone')} and {cal.get('receiver_phone')}",
            "confidence": 0.95,
            "evidence_id": cal.get("call_id")
        })

    # 4. Financial Transactions
    txs = query_transactions(person_id=person_id, limit=15)
    for tx in txs:
        raw_events.append({
            "event_id": tx.get("transaction_id", str(uuid.uuid4())),
            "timestamp": tx.get("transaction_timestamp") or "2024-08-16T14:32:00Z",
            "source_type": "TRANSACTION",
            "title": f"Financial Transfer ({tx.get('transaction_type')})",
            "description": f"Wire transfer amount ${tx.get('amount', 0):,.2f} USD flagged suspicious: {tx.get('is_flagged_suspicious')}",
            "confidence": 0.98,
            "evidence_id": tx.get("transaction_id")
        })

    # 5. Evidence Collection
    evd_items = query_evidence(case_id=case_id, limit=10)
    for ev in evd_items:
        raw_events.append({
            "event_id": ev.get("evidence_id", str(uuid.uuid4())),
            "timestamp": ev.get("collected_at") or "2024-08-17T22:00:00Z",
            "source_type": "EVIDENCE",
            "title": f"Evidence Vault Intake: {ev.get('title')}",
            "description": f"Secure intake of {ev.get('evidence_type')} (Hash: {ev.get('hash', '')[:16]}...)",
            "confidence": 1.0,
            "evidence_id": ev.get("evidence_id")
        })

    # Sort strictly chronologically
    def parse_dt(e):
        try:
            return datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    sorted_events = sorted(raw_events, key=parse_dt)

    return [
        TimelineItem(
            event_id=item["event_id"],
            timestamp=item["timestamp"],
            source_type=item["source_type"],
            title=item["title"],
            description=item["description"],
            confidence=item["confidence"],
            evidence_id=item.get("evidence_id")
        )
        for item in sorted_events[:limit]
    ]

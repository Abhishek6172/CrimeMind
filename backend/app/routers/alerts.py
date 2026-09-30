from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.alert import AlertItemResponse, AlertUpdate
from app.schemas.auth import TokenData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["Tactical Alerts"])

# In-memory alert status tracking for demo persistence
_ALERT_STATUS_CACHE = {}


@router.get("", response_model=List[AlertItemResponse])
def list_alerts(
    alert_type: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve live tactical alerts with verified source evidence.
    Categories: suspicious_activity, new_cctv_detection, evidence_match, cross_case_connection,
    unusual_transaction, repeated_vehicle_appearance, agent_generated_alert.
    """
    base_time = datetime.utcnow()

    alerts_list = [
        AlertItemResponse(
            id="alt-01",
            title="Unusual Off-Hour Vault Terminal Access",
            type="suspicious_activity",
            severity="CRITICAL",
            timestamp=base_time,
            description="Electronic access badge #4419 swiped at Sub-Level 3 safe deposit archive at 02:44 AM outside authorized shifts.",
            case_id="00000000-0000-0000-0000-000000000001",
            case_number="CASE-2024-2390",
            status=_ALERT_STATUS_CACHE.get("alt-01", "new"),
            source_evidence={
                "id": "EV-2024-0012",
                "title": "Sub-Level Access Card Logs & Biometric Checkpoint",
                "type": "document"
            }
        ),
        AlertItemResponse(
            id="alt-02",
            title="ANPR Recurrence: Dodge Charger (SYN-7X91)",
            type="repeated_vehicle_appearance",
            severity="HIGH",
            timestamp=base_time,
            description="Vehicle sighted 4 times in 3 hours circling First National Bank perimeter and waterfront warehouses.",
            case_id="00000000-0000-0000-0000-000000000001",
            case_number="CASE-2024-2390",
            status=_ALERT_STATUS_CACHE.get("alt-02", "new"),
            source_evidence={
                "id": "CCTV-FRAME-99120-HD",
                "title": "Optical ANPR Capture at Terminal Cam #04",
                "type": "cctv_record"
            }
        ),
        AlertItemResponse(
            id="alt-03",
            title="Cross-Case Ballistic Match Found",
            type="cross_case_connection",
            severity="CRITICAL",
            timestamp=base_time,
            description="9mm casing rifling striations matched between active CASE-2024-2390 and cold CASE-2021-0044.",
            case_id="00000000-0000-0000-0000-000000000001",
            case_number="CASE-2024-2390",
            status=_ALERT_STATUS_CACHE.get("alt-03", "new"),
            source_evidence={
                "id": "EV-2024-0089",
                "title": "Ballistic Micro-Scan & Striation Analysis",
                "type": "forensic_record"
            }
        ),
        AlertItemResponse(
            id="alt-04",
            title="Offshore Wire Velocity Spike ($25,000)",
            type="unusual_transaction",
            severity="HIGH",
            timestamp=base_time,
            description="Trevor Bennett account wired $25,000 to Cyprus escrow 48 hours prior to vault breach.",
            case_id="00000000-0000-0000-0000-000000000002",
            case_number="CASE-2024-1182",
            status=_ALERT_STATUS_CACHE.get("alt-04", "new"),
            source_evidence={
                "id": "TX-WIRE-449102",
                "title": "First National Swift MT103 Wire Confirmation",
                "type": "transaction"
            }
        ),
        AlertItemResponse(
            id="alt-05",
            title="LangGraph Agent Anomaly: Cipher Nexus Cluster",
            type="agent_generated_alert",
            severity="MEDIUM",
            timestamp=base_time,
            description="Graph Agent detected 7 peripheral suspects calling Evelyn Reed's burner number within a 15-minute window.",
            case_id="00000000-0000-0000-0000-000000000001",
            case_number="CASE-2024-2390",
            status=_ALERT_STATUS_CACHE.get("alt-05", "new"),
            source_evidence={
                "id": "CDR-BURST-20240329",
                "title": "Tower Azimuth Intercept Logs (South Sector)",
                "type": "call_record"
            }
        )
    ]

    if alert_type and alert_type != "all":
        alerts_list = [a for a in alerts_list if a.type == alert_type]
    if severity and severity != "all":
        alerts_list = [a for a in alerts_list if a.severity == severity]

    return alerts_list


@router.patch("/{id}", response_model=AlertItemResponse)
def update_alert_status(
    id: str,
    update_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Acknowledge or resolve an active tactical alert."""
    _ALERT_STATUS_CACHE[id] = update_data.status
    alerts = list_alerts(db=db, current_user=current_user)
    target = next((a for a in alerts if a.id == id), None)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{id}' not found.")
    target.status = update_data.status
    return target

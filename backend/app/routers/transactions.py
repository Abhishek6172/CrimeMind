from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.communication import Transaction
from app.schemas.communication import TransactionResponse
from app.schemas.auth import TokenData
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Financial Intelligence"])


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    suspicious_only: Optional[bool] = Query(None, description="Filter by flagged suspicious transactions"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (wire_transfer, crypto_synthetic)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Retrieve financial ledger transactions and money laundering alerts."""
    query = db.query(Transaction)
    if suspicious_only is not None:
        query = query.filter(Transaction.is_flagged_suspicious == suspicious_only)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    records = query.order_by(Transaction.transaction_timestamp.desc()).offset(skip).limit(limit).all()

    return [
        TransactionResponse(
            transaction_id=t.transaction_id,
            sender_person_id=t.sender_person_id,
            receiver_person_id=t.receiver_person_id,
            sender_account=t.sender_account,
            receiver_account=t.receiver_account,
            amount=float(t.amount),
            currency=t.currency,
            transaction_timestamp=t.transaction_timestamp,
            transaction_type=t.transaction_type,
            merchant=t.merchant,
            location_id=t.location_id,
            is_flagged_suspicious=t.is_flagged_suspicious
        )
        for t in records
    ]

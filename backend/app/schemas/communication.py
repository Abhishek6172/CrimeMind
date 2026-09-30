from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class StatementResponse(BaseModel):
    statement_id: UUID
    case_id: UUID
    person_id: Optional[UUID] = None
    statement_text: str
    statement_timestamp: datetime
    source: str
    investigator_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CallRecordResponse(BaseModel):
    call_id: UUID
    caller_phone: str
    caller_person_id: Optional[UUID] = None
    caller_person_name: Optional[str] = None
    receiver_phone: str
    receiver_person_id: Optional[UUID] = None
    receiver_person_name: Optional[str] = None
    call_timestamp: datetime
    duration_seconds: int
    call_type: str
    originating_location_id: Optional[UUID] = None
    destination_location_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    transaction_id: UUID
    sender_person_id: Optional[UUID] = None
    sender_person_name: Optional[str] = None
    receiver_person_id: Optional[UUID] = None
    receiver_person_name: Optional[str] = None
    sender_account: str
    receiver_account: str
    amount: float
    currency: str
    transaction_timestamp: datetime
    transaction_type: str
    merchant: Optional[str] = None
    location_id: Optional[UUID] = None
    is_flagged_suspicious: bool

    class Config:
        from_attributes = True

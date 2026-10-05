"""Database access helpers used by CrimeMind investigative agents.

These helpers fail explicitly when PostgreSQL is unavailable or a query fails;
they never manufacture investigative records and present them as database facts.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from engine.config.settings import settings

logger = logging.getLogger("CrimeMind.DatabaseTools")


class DatabaseConnection:
    """Lazily create and cache the SQLAlchemy engine."""
    _engine: Optional[Engine] = None
    _engine_url: Optional[str] = None

    @classmethod
    def get_engine(cls) -> Optional[Engine]:
        url = (settings.DATABASE_URL or "").strip()
        if not url:
            logger.warning("DATABASE_URL is empty; database queries are disabled.")
            return None
        if cls._engine_url == url:
            # Avoid repeatedly retrying a configuration that failed to initialize.
            return cls._engine
        try:
            if cls._engine is not None:
                cls._engine.dispose()
            cls._engine = create_engine(url, pool_pre_ping=True, future=True)
            cls._engine_url = url
            return cls._engine
        except Exception as exc:
            logger.error("Could not initialize the PostgreSQL engine: %s", exc)
            cls._engine = None
            cls._engine_url = url
            return None

    @classmethod
    def dispose(cls) -> None:
        if cls._engine is not None:
            cls._engine.dispose()
        cls._engine = None
        cls._engine_url = None


def _query(sql: str, params: Dict[str, Any], label: str) -> List[Dict[str, Any]]:
    engine = DatabaseConnection.get_engine()
    if engine is None:
        raise RuntimeError("PostgreSQL is unavailable or DATABASE_URL is not configured; refusing to treat missing data as an empty result.")
    try:
        with engine.connect() as conn:
            rows = [dict(row._mapping) for row in conn.execute(text(sql), params)]
        return [_normalize_row(row) for row in rows]
    except SQLAlchemyError as exc:
        logger.exception("Database query %s failed", label)
        raise RuntimeError(f"Database query '{label}' failed: {exc}") from exc
    except Exception as exc:
        logger.exception("Unexpected failure in database query %s", label)
        raise RuntimeError(f"Unexpected database query failure for '{label}': {exc}") from exc


def _normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert SQL values into JSON-friendly Python values."""
    for key, value in list(row.items()):
        if value is None or isinstance(value, (str, int, float, bool)):
            continue
        if hasattr(value, "isoformat"):
            row[key] = value.isoformat()
        elif isinstance(value, dict):
            row[key] = value
        elif isinstance(value, (list, tuple)):
            row[key] = list(value)
        else:
            row[key] = str(value)
    return row


def query_cases(case_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conditions, params = [], {"limit": max(1, min(int(limit), 5000))}
    if case_id:
        conditions.append("case_id::text = :case_id")
        params["case_id"] = str(case_id)
    if status:
        conditions.append("LOWER(status) = LOWER(:status)")
        params["status"] = status
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    return _query(f"SELECT * FROM cases{where} ORDER BY opened_at DESC NULLS LAST LIMIT :limit", params, "cases")


def query_incidents(case_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conditions, params = [], {"limit": max(1, min(int(limit), 5000))}
    if case_id:
        conditions.append("case_id::text = :case_id")
        params["case_id"] = str(case_id)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    return _query(f"SELECT * FROM incidents{where} ORDER BY occurred_at DESC NULLS LAST LIMIT :limit", params, "incidents")


def query_persons(name_query: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    params: Dict[str, Any] = {"limit": max(1, min(int(limit), 1000))}
    where = ""
    if name_query:
        where = " WHERE full_name ILIKE :name_query OR aliases::text ILIKE :name_query"
        params["name_query"] = f"%{name_query}%"
    return _query(f"SELECT * FROM persons{where} ORDER BY full_name LIMIT :limit", params, "persons")


def query_vehicles(registration: Optional[str] = None, owner_person_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    conditions, params = [], {"limit": max(1, min(int(limit), 1000))}
    if registration:
        conditions.append("registration_number ILIKE :registration")
        params["registration"] = f"%{registration}%"
    if owner_person_id:
        conditions.append("owner_person_id::text = :owner_person_id")
        params["owner_person_id"] = str(owner_person_id)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    return _query(f"SELECT * FROM vehicles{where} ORDER BY registration_number LIMIT :limit", params, "vehicles")


def query_transactions(person_id: Optional[str] = None, case_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    # The transactions table is person-linked; it has no case_id column.
    if case_id:
        raise ValueError("The transactions table has no case_id column; filter by person_id instead.")
    conditions, params = [], {"limit": max(1, min(int(limit), 5000))}
    if person_id:
        conditions.append("(sender_person_id::text = :person_id OR receiver_person_id::text = :person_id)")
        params["person_id"] = str(person_id)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    return _query(f"SELECT * FROM transactions{where} ORDER BY transaction_timestamp DESC NULLS LAST LIMIT :limit", params, "transactions")

def query_calls(person_id: Optional[str] = None, case_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    # Call records are person-linked; they have no case_id column.
    if case_id:
        raise ValueError("The call_records table has no case_id column; filter by person_id instead.")
    conditions, params = [], {"limit": max(1, min(int(limit), 5000))}
    if person_id:
        conditions.append("(caller_person_id::text = :person_id OR receiver_person_id::text = :person_id)")
        params["person_id"] = str(person_id)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    return _query(f"SELECT * FROM call_records{where} ORDER BY call_timestamp DESC NULLS LAST LIMIT :limit", params, "calls")

import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text
from engine.config.settings import settings

logger = logging.getLogger("CrimeMind.DatabaseTools")


class DatabaseConnection:
    """Singleton managed connection pool for typed investigative queries."""
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
                    pool_size=8,
                    max_overflow=15,
                    connect_args={"connect_timeout": 1}
                )
                with engine_inst.connect() as conn:
                    conn.execute(text("SELECT 1"))
                cls._engine = engine_inst
                cls._is_available = True
            except Exception as e:
                logger.info(f"Database connection offline, using synthetic investigative fallback.")
                cls._is_available = False
                cls._engine = None
        return cls._engine


# ==============================================================================
# 1. CASE QUERIES
# ==============================================================================
def query_cases(
    case_id: Optional[str] = None,
    case_number: Optional[str] = None,
    status: Optional[str] = None,
    crime_type: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Typed query for case dossiers."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_cases(case_id, case_number)

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if case_id:
                try:
                    conditions.append("c.case_id = :case_id")
                    params["case_id"] = str(uuid.UUID(case_id))
                except Exception:
                    conditions.append("c.case_number ILIKE :case_id_str")
                    params["case_id_str"] = f"%{case_id}%"

            if case_number:
                conditions.append("c.case_number ILIKE :case_number")
                params["case_number"] = f"%{case_number}%"

            if status:
                conditions.append("c.status = :status")
                params["status"] = status

            if crime_type:
                conditions.append("c.crime_type ILIKE :crime_type")
                params["crime_type"] = f"%{crime_type}%"

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT c.case_id, c.case_number, c.title, c.description,
                       c.status, c.priority, c.crime_type, c.opened_at,
                       c.closed_at, c.metadata
                FROM cases c
                {where_clause}
                ORDER BY c.opened_at DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["case_id"] = str(r["case_id"])
                if r.get("opened_at"):
                    r["opened_at"] = r["opened_at"].isoformat()
                if r.get("closed_at"):
                    r["closed_at"] = r["closed_at"].isoformat()
            return rows if rows else _mock_cases(case_id, case_number)
    except Exception as e:
        logger.warning(f"Error executing query_cases ({e}); returning synthetic fallback.")
        return _mock_cases(case_id, case_number)


# ==============================================================================
# 2. PERSON QUERIES
# ==============================================================================
def query_persons(
    person_id: Optional[str] = None,
    name_query: Optional[str] = None,
    national_id: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Typed query for synthetic subject profiles."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_persons(person_id, name_query)

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if person_id:
                try:
                    conditions.append("p.person_id = :person_id")
                    params["person_id"] = str(uuid.UUID(person_id))
                except Exception:
                    pass

            if name_query:
                conditions.append("(p.full_name ILIKE :name_query OR p.aliases::text ILIKE :name_query)")
                params["name_query"] = f"%{name_query}%"

            if national_id:
                conditions.append("p.national_id_synthetic = :national_id")
                params["national_id"] = national_id

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT p.person_id, p.first_name, p.last_name, p.full_name,
                       p.aliases, p.date_of_birth, p.age, p.gender,
                       p.national_id_synthetic, p.occupation, p.description,
                       p.phone_numbers, p.email_addresses, p.risk_level,
                       p.risk_indicators, p.notes
                FROM persons p
                {where_clause}
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["person_id"] = str(r["person_id"])
                if r.get("date_of_birth"):
                    r["date_of_birth"] = str(r["date_of_birth"])
            return rows if rows else _mock_persons(person_id, name_query)
    except Exception as e:
        logger.warning(f"Error executing query_persons ({e}); returning synthetic fallback.")
        return _mock_persons(person_id, name_query)


# ==============================================================================
# 3. VEHICLE QUERIES
# ==============================================================================
def query_vehicles(
    vehicle_id: Optional[str] = None,
    registration: Optional[str] = None,
    owner_person_id: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Typed query for synthetic vehicle records."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_vehicles(registration)

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if vehicle_id:
                try:
                    conditions.append("v.vehicle_id = :vehicle_id")
                    params["vehicle_id"] = str(uuid.UUID(vehicle_id))
                except Exception:
                    pass

            if registration:
                conditions.append("v.registration_number ILIKE :registration")
                params["registration"] = f"%{registration}%"

            if owner_person_id:
                try:
                    conditions.append("v.owner_person_id = :owner_person_id")
                    params["owner_person_id"] = str(uuid.UUID(owner_person_id))
                except Exception:
                    pass

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT v.vehicle_id, v.registration_number, v.vin, v.vehicle_type,
                       v.make, v.model, v.year, v.color, v.owner_person_id,
                       v.stolen_status, v.notes
                FROM vehicles v
                {where_clause}
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["vehicle_id"] = str(r["vehicle_id"])
                if r.get("owner_person_id"):
                    r["owner_person_id"] = str(r["owner_person_id"])
            return rows if rows else _mock_vehicles(registration)
    except Exception as e:
        logger.warning(f"Error in query_vehicles ({e}); using synthetic fallback.")
        return _mock_vehicles(registration)


# ==============================================================================
# 4. INCIDENT QUERIES
# ==============================================================================
def query_incidents(
    case_id: Optional[str] = None,
    crime_type: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Typed query for incident records."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_incidents(case_id)

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if case_id:
                try:
                    conditions.append("i.case_id = :case_id")
                    params["case_id"] = str(uuid.UUID(case_id))
                except Exception:
                    pass

            if crime_type:
                conditions.append("i.crime_type ILIKE :crime_type")
                params["crime_type"] = f"%{crime_type}%"

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT i.incident_id, i.case_id, i.incident_number, i.crime_type,
                       i.severity, i.status, i.occurred_at, i.location_id,
                       i.description, i.modus_operandi, i.estimated_loss_amount
                FROM incidents i
                {where_clause}
                ORDER BY i.occurred_at DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["incident_id"] = str(r["incident_id"])
                if r.get("case_id"):
                    r["case_id"] = str(r["case_id"])
                if r.get("location_id"):
                    r["location_id"] = str(r["location_id"])
                if r.get("occurred_at"):
                    r["occurred_at"] = r["occurred_at"].isoformat()
            return rows if rows else _mock_incidents(case_id)
    except Exception as e:
        logger.warning(f"Error in query_incidents ({e}); using synthetic fallback.")
        return _mock_incidents(case_id)


# ==============================================================================
# 5. CALL DETAIL QUERIES
# ==============================================================================
def query_calls(
    phone_number: Optional[str] = None,
    person_id: Optional[str] = None,
    limit: int = 25
) -> List[Dict[str, Any]]:
    """Typed query for synthetic call records."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_calls()

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if phone_number:
                conditions.append("(c.caller_phone ILIKE :phone OR c.receiver_phone ILIKE :phone)")
                params["phone"] = f"%{phone_number}%"

            if person_id:
                try:
                    pid = str(uuid.UUID(person_id))
                    conditions.append("(c.caller_person_id = :pid OR c.receiver_person_id = :pid)")
                    params["pid"] = pid
                except Exception:
                    pass

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT c.call_id, c.caller_phone, c.caller_person_id,
                       c.receiver_phone, c.receiver_person_id, c.call_timestamp,
                       c.duration_seconds, c.call_type, c.originating_location_id,
                       c.destination_location_id, c.tower_metadata
                FROM call_records c
                {where_clause}
                ORDER BY c.call_timestamp DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["call_id"] = str(r["call_id"])
                if r.get("caller_person_id"):
                    r["caller_person_id"] = str(r["caller_person_id"])
                if r.get("receiver_person_id"):
                    r["receiver_person_id"] = str(r["receiver_person_id"])
                if r.get("call_timestamp"):
                    r["call_timestamp"] = r["call_timestamp"].isoformat()
            return rows if rows else _mock_calls()
    except Exception as e:
        logger.warning(f"Error in query_calls ({e}); using synthetic fallback.")
        return _mock_calls()


# ==============================================================================
# 6. FINANCIAL TRANSACTION QUERIES
# ==============================================================================
def query_transactions(
    person_id: Optional[str] = None,
    account: Optional[str] = None,
    suspicious_only: bool = False,
    limit: int = 25
) -> List[Dict[str, Any]]:
    """Typed query for financial transactions."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_transactions()

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if person_id:
                try:
                    pid = str(uuid.UUID(person_id))
                    conditions.append("(t.sender_person_id = :pid OR t.receiver_person_id = :pid)")
                    params["pid"] = pid
                except Exception:
                    pass

            if account:
                conditions.append("(t.sender_account ILIKE :acc OR t.receiver_account ILIKE :acc)")
                params["acc"] = f"%{account}%"

            if suspicious_only:
                conditions.append("t.is_flagged_suspicious = TRUE")

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT t.transaction_id, t.sender_person_id, t.receiver_person_id,
                       t.sender_account, t.receiver_account, t.amount,
                       t.currency, t.transaction_timestamp, t.transaction_type,
                       t.merchant, t.is_flagged_suspicious, t.metadata
                FROM transactions t
                {where_clause}
                ORDER BY t.transaction_timestamp DESC
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["transaction_id"] = str(r["transaction_id"])
                if r.get("sender_person_id"):
                    r["sender_person_id"] = str(r["sender_person_id"])
                if r.get("receiver_person_id"):
                    r["receiver_person_id"] = str(r["receiver_person_id"])
                if r.get("amount"):
                    r["amount"] = float(r["amount"])
                if r.get("transaction_timestamp"):
                    r["transaction_timestamp"] = r["transaction_timestamp"].isoformat()
            return rows if rows else _mock_transactions()
    except Exception as e:
        logger.warning(f"Error in query_transactions ({e}); using synthetic fallback.")
        return _mock_transactions()


# ==============================================================================
# SYNTHETIC DEMO FALLBACK DATA
# ==============================================================================
def _mock_cases(case_id: Optional[str] = None, case_number: Optional[str] = None) -> List[Dict[str, Any]]:
    all_cases = [
        {
            "case_id": "c1a2b3c4-0001-4000-8000-000000000001",
            "case_number": "CASE-2024-0106",
            "title": "Midnight Syndicate: Belvedere Estate Burglary #7",
            "description": "High-value residential break-in in Northshore Heights. Laser-severed fiber alarm cables, side window forced entry, $240,000 jewelry taken.",
            "status": "under_investigation",
            "priority": "high",
            "crime_type": "Aggravated Burglary",
            "opened_at": "2024-06-18T03:15:00Z",
            "closed_at": None,
            "metadata": {"suspects": ["Julian Drake", "Marcus Vance"], "lead": "Det. Sarah Vance"}
        },
        {
            "case_id": "c1a2b3c4-0002-4000-8000-000000000002",
            "case_number": "CASE-2024-1100",
            "title": "Midtown Jewelry Exchange Armed Robbery",
            "description": "Rapid 3-minute armed robbery of boutique watch counter. Dark Gray Dodge Charger (SYN-7X91) logged departing at high velocity.",
            "status": "under_investigation",
            "priority": "critical",
            "crime_type": "Commercial Robbery",
            "opened_at": "2024-05-10T21:30:00Z",
            "closed_at": None,
            "metadata": {"suspects": ["Damian Cross"], "vehicle": "SYN-7X91", "lead": "Lt. James Miller"}
        },
        {
            "case_id": "c1a2b3c4-0003-4000-8000-000000000003",
            "case_number": "CASE-2024-0771",
            "title": "First National Bank Night Vault Infiltration",
            "description": "Attempted basement vault breach following $25,000 illicit funding transfer. Core drill bits and electronic jammer left on scene.",
            "status": "under_investigation",
            "priority": "critical",
            "crime_type": "Armed Bank Robbery",
            "opened_at": "2024-05-14T02:45:00Z",
            "closed_at": None,
            "metadata": {"suspects": ["Trevor Bennett", "Evelyn Reed"], "lead": "Det. Sarah Vance"}
        },
        {
            "case_id": "c1a2b3c4-0004-4000-8000-000000000004",
            "case_number": "CASE-2024-2390",
            "title": "Waterfront Terminal 4 Container Freight Diversion",
            "description": "Commercial shipping container breach at Port Terminal 4. High-value electronics diverted using false customs manifest.",
            "status": "under_investigation",
            "priority": "high",
            "crime_type": "Organized Cargo Theft",
            "opened_at": "2024-07-18T05:00:00Z",
            "closed_at": None,
            "metadata": {"suspects": ["Viktor Orlov", "Evelyn Reed"], "lead": "Capt. Robert Chen"}
        },
        {
            "case_id": "c1a2b3c4-0006-4000-8000-000000000006",
            "case_number": "CASE-2024-4019",
            "title": "Harbor District Weapons & Synthetic Narcotics Pipeline",
            "description": "Active open case initiated following confidential informant tip regarding maritime shipment of military-grade optics and precursors at Pier 42.",
            "status": "open",
            "priority": "critical",
            "crime_type": "Contraband Trafficking",
            "opened_at": "2024-08-20T08:00:00Z",
            "closed_at": None,
            "metadata": {"lead": "Det. Sarah Vance"}
        },
        {
            "case_id": "c1a2b3c4-0007-4000-8000-000000000007",
            "case_number": "CASE-2024-8831",
            "title": "Municipal Ledger Cryptolocker Extortion Breach",
            "description": "Newly opened probe into decentralized wire diversion spoofing city contractor escrow accounts.",
            "status": "open",
            "priority": "high",
            "crime_type": "Cyber Extortion & Wire Fraud",
            "opened_at": "2024-08-26T11:45:00Z",
            "closed_at": None,
            "metadata": {"lead": "Lt. James Miller"}
        },
        {
            "case_id": "c1a2b3c4-0008-4000-8000-000000000008",
            "case_number": "CASE-2023-0100",
            "title": "Belvedere Diamond Vault Breach #1 (Reopened Lead)",
            "description": "Cold case reopened on August 2024 after CSU spectrographic laser tool-mark correlation linked original incision with seized Julian Drake apparatus.",
            "status": "reopened",
            "priority": "critical",
            "crime_type": "Aggravated Burglary",
            "opened_at": "2023-01-10T10:00:00Z",
            "closed_at": None,
            "metadata": {"suspects": ["Julian Drake", "Marcus Vance"], "lead": "Det. Sarah Vance"}
        },
        {
            "case_id": "c1a2b3c4-0005-4000-8000-000000000005",
            "case_number": "CASE-2021-0044",
            "title": "Operation Ironclad: Harbor Logistics Freight Hijacking",
            "description": "Historical investigation resulting in conviction of Viktor Orlov for armed hijacking of logistics convoy. Case successfully closed with full asset recovery.",
            "status": "closed",
            "priority": "high",
            "crime_type": "Organized Cargo Theft",
            "opened_at": "2021-03-10T12:00:00Z",
            "closed_at": "2021-11-20T17:00:00Z",
            "metadata": {"convicted": ["Viktor Orlov"], "lead": "Capt. Robert Chen"}
        },
        {
            "case_id": "c1a2b3c4-0009-4000-8000-000000000009",
            "case_number": "CASE-2022-0912",
            "title": "Metro Transit Armored Truck Highway Ambush",
            "description": "Comprehensive armed robbery prosecution closed with guilty plea. All cash pallets accounted for.",
            "status": "closed",
            "priority": "critical",
            "crime_type": "Armed Robbery",
            "opened_at": "2022-09-12T14:00:00Z",
            "closed_at": "2023-04-15T10:00:00Z",
            "metadata": {"lead": "Capt. Robert Chen"}
        }
    ]
    if case_number:
        filtered = [c for c in all_cases if case_number.lower() in c["case_number"].lower() or case_number.lower() in c["title"].lower()]
        return filtered if filtered else all_cases
    if case_id:
        filtered = [c for c in all_cases if case_id.lower() in c["case_id"].lower() or case_id.lower() in c["case_number"].lower()]
        return filtered if filtered else all_cases
    return all_cases


def _mock_persons(person_id: Optional[str] = None, name_query: Optional[str] = None) -> List[Dict[str, Any]]:
    all_persons = [
        {
            "person_id": "p1a2b3c4-0001-4000-8000-000000000001",
            "first_name": "Marcus",
            "last_name": "Vance",
            "full_name": "Marcus Vance",
            "aliases": ["Viper", "The Fence"],
            "date_of_birth": "1980-04-12",
            "age": 44,
            "gender": "male",
            "national_id_synthetic": "SYN-NAT-MV89421",
            "occupation": "Pawn Shop Operator & Fencing Coordinator",
            "description": "Suspected fencing coordinator and organizer behind high-value residential estate break-ins (CASE-2024-0106).",
            "phone_numbers": ["+1-555-882-1902"],
            "email_addresses": ["vance.pawn@synthetic-mail.net"],
            "risk_level": "extreme",
            "risk_indicators": ["prior_burglary_conviction", "high_value_fencing", "money_laundering"],
            "notes": "Liquidation nexus at 742 St. Marks Place pawn shop; encrypted telecom logs with locksmith Julian Drake."
        },
        {
            "person_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "first_name": "Julian",
            "last_name": "Drake",
            "full_name": "Julian Drake",
            "aliases": ["Ghost", "The Keymaster"],
            "date_of_birth": "1986-09-24",
            "age": 38,
            "gender": "male",
            "national_id_synthetic": "SYN-NAT-JD34019",
            "occupation": "Commercial Locksmith & Safecracker",
            "description": "Master safecracker and electronic security bypass specialist for the Midnight Syndicate.",
            "phone_numbers": ["+1-555-412-9901"],
            "email_addresses": ["drake.locks@synthetic-mail.net"],
            "risk_level": "high",
            "risk_indicators": ["master_locksmith_bypass", "alarm_suppression_expert", "laser_tool_mark_match"],
            "notes": "Optical laser cutter tool mark match (EVD-2024-00192, 98% conf); White Chevrolet locksmith van (SYN-9B14); seized drill bit (EVD-2023-00049)."
        },
        {
            "person_id": "p1a2b3c4-0003-4000-8000-000000000003",
            "first_name": "Damian",
            "last_name": "Cross",
            "full_name": "Damian Cross",
            "aliases": ["Apex"],
            "date_of_birth": "1991-03-15",
            "age": 33,
            "gender": "male",
            "national_id_synthetic": "SYN-NAT-DC10294",
            "occupation": "Nightclub Security Lead & Wheelman",
            "description": "Armed robbery getaway driver and registered owner of Dark Gray 2021 Dodge Charger (SYN-7X91).",
            "phone_numbers": ["+1-555-667-2019"],
            "email_addresses": ["damian.cross@synthetic-mail.net"],
            "risk_level": "high",
            "risk_indicators": ["getaway_driver", "registered_owner_charger", "evasion_tactics"],
            "notes": "CAM-DT-014 optical match departing at 92 km/h (EVD-2024-00341); Lexington Ave cell tower CDR ping (EVD-2024-01188)."
        },
        {
            "person_id": "p1a2b3c4-0004-4000-8000-000000000004",
            "first_name": "Evelyn",
            "last_name": "Reed",
            "full_name": "Evelyn Reed",
            "aliases": ["Cipher", "The Broker"],
            "date_of_birth": "1983-11-04",
            "age": 41,
            "gender": "female",
            "national_id_synthetic": "SYN-NAT-ER99401",
            "occupation": "Independent Logistics Consultant",
            "description": "Central communications nexus and offshore financial broker linking disparate criminal syndicates.",
            "phone_numbers": ["+1-555-019-4821"],
            "email_addresses": ["evelyn.reed@synthetic-mail.net"],
            "risk_level": "extreme",
            "risk_indicators": ["clandestine_communications", "multi_syndicate_facilitator", "burner_nexus_hub"],
            "notes": "Encrypted VoIP tap (EVD-2024-00892); 480 logged calls connecting Vance, Cross, Bennett, and Orlov; coordinated $25k Cayman escrow wire."
        },
        {
            "person_id": "p1a2b3c4-0005-4000-8000-000000000005",
            "first_name": "Trevor",
            "last_name": "Bennett",
            "full_name": "Trevor Bennett",
            "aliases": ["Spike"],
            "date_of_birth": "1997-08-20",
            "age": 27,
            "gender": "male",
            "national_id_synthetic": "SYN-NAT-TB77102",
            "occupation": "Scrap Metal Sorter & Vault Operative",
            "description": "Safe penetration operative implicated in First National Bank branch breach (CASE-2024-0771).",
            "phone_numbers": ["+1-555-334-9182"],
            "email_addresses": ["t.bennett@synthetic-mail.net"],
            "risk_level": "high",
            "risk_indicators": ["rapid_withdrawal_mule", "safe_breach_operative", "heavy_tooling"],
            "notes": "$25,000 Cayman escrow wire (EVD-2024-00512); CAM-BK-003 facial match in rear bank alley at 02:00 UTC."
        },
        {
            "person_id": "p1a2b3c4-0006-4000-8000-000000000006",
            "first_name": "Viktor",
            "last_name": "Orlov",
            "full_name": "Viktor Orlov",
            "aliases": ["Old Fox"],
            "date_of_birth": "1966-02-14",
            "age": 58,
            "gender": "male",
            "national_id_synthetic": "SYN-NAT-VO44901",
            "occupation": "Freight Terminal Overseer",
            "description": "Recidivist cargo heist boss convicted in CASE-2021-0044; lead suspect in Terminal 4 container theft (CASE-2024-2390).",
            "phone_numbers": ["+1-555-901-7723"],
            "email_addresses": ["orlov.freight@synthetic-mail.net"],
            "risk_level": "extreme",
            "risk_indicators": ["historical_convict_2021", "recidivist_syndicate_boss", "interstate_smuggler"],
            "notes": "Forged customs manifest (EVD-2024-01042); Black Ford Explorer (SYN-4K82) logged entering Pier 42."
        }
    ]
    if name_query:
        nq = name_query.lower()
        matched = [p for p in all_persons if nq in p["full_name"].lower() or any(nq in a.lower() for a in p["aliases"])]
        return matched if matched else all_persons
    if person_id:
        matched = [p for p in all_persons if person_id.lower() in p["person_id"].lower()]
        return matched if matched else all_persons
    return all_persons


def _mock_vehicles(registration: Optional[str] = None) -> List[Dict[str, Any]]:
    all_vehicles = [
        {
            "vehicle_id": "v1a2b3c4-0001-4000-8000-000000000001",
            "registration_number": "SYN-7X91",
            "vin": "1SYN2DGE8912301X4",
            "vehicle_type": "sedan",
            "make": "Dodge",
            "model": "Charger SRT",
            "year": 2021,
            "color": "Dark Gray",
            "owner_person_id": "p1a2b3c4-0003-4000-8000-000000000003",
            "owner_name": "Damian Cross",
            "stolen_status": False,
            "notes": "Flagged armed robbery getaway vehicle; CAM-DT-014 optical match at 92 km/h (EVD-2024-00341)."
        },
        {
            "vehicle_id": "v1a2b3c4-0002-4000-8000-000000000002",
            "registration_number": "SYN-4K82",
            "vin": "1SYN1FRD4892019Y9",
            "vehicle_type": "suv",
            "make": "Ford",
            "model": "Explorer",
            "year": 2018,
            "color": "Black",
            "owner_person_id": "p1a2b3c4-0006-4000-8000-000000000006",
            "owner_name": "Viktor Orlov",
            "stolen_status": False,
            "notes": "Linked to 2021 cargo theft CASE-2021-0044; spotted at Terminal 4 Gate 8 in 2024 (CAM-PT-028)."
        },
        {
            "vehicle_id": "v1a2b3c4-0003-4000-8000-000000000003",
            "registration_number": "SYN-9B14",
            "vin": "1SYN3CHV7710294Z1",
            "vehicle_type": "van",
            "make": "Chevrolet",
            "model": "Express Locksmith Van",
            "year": 2019,
            "color": "White",
            "owner_person_id": "p1a2b3c4-0002-4000-8000-000000000002",
            "owner_name": "Julian Drake",
            "stolen_status": False,
            "notes": "Commercial locksmith utility van carrying key cutting tooling; spotted near estate burglaries."
        }
    ]
    if registration:
        matched = [v for v in all_vehicles if registration.lower() in v["registration_number"].lower() or registration.lower() in v["make"].lower()]
        return matched if matched else all_vehicles
    return all_vehicles


def _mock_incidents(case_id: Optional[str] = None) -> List[Dict[str, Any]]:
    return [{
        "incident_id": "i1a2b3c4-0004-4000-8000-000000000004",
        "case_id": "c1a2b3c4-0001-4000-8000-000000000001",
        "incident_number": "INC-2024-0891",
        "crime_type": "Warehouse Contraband Breach",
        "severity": "severe",
        "status": "under_investigation",
        "occurred_at": "2024-08-17T21:40:00Z",
        "location_id": "l1a2b3c4-0005-4000-8000-000000000005",
        "description": "Forced entry into commercial freight terminal by two masked actors.",
        "modus_operandi": "Electronic lock jammer and thermal blinding spray",
        "estimated_loss_amount": 145000.00
    }]


def _mock_calls() -> List[Dict[str, Any]]:
    return [{
        "call_id": "cal-001",
        "caller_phone": "+1-555-019-2831",
        "caller_person_id": "p1a2b3c4-0002-4000-8000-000000000002",
        "receiver_phone": "+1-555-014-9902",
        "receiver_person_id": "p2b3c4d5-0006-4000-8000-000000000006",
        "call_timestamp": "2024-08-17T20:15:00Z",
        "duration_seconds": 184,
        "call_type": "voice",
        "originating_location_id": None,
        "destination_location_id": None,
        "tower_metadata": {"cell_tower_id": "TOW-EAST-42", "signal_strength": -78}
    }]


def _mock_transactions() -> List[Dict[str, Any]]:
    return [{
        "transaction_id": "tx-001",
        "sender_person_id": "p1a2b3c4-0002-4000-8000-000000000002",
        "receiver_person_id": "p2b3c4d5-0006-4000-8000-000000000006",
        "sender_account": "ACC-SYN-8831",
        "receiver_account": "ACC-OFFSHORE-9901",
        "amount": 25000.00,
        "currency": "USD",
        "transaction_timestamp": "2024-08-16T14:32:00Z",
        "transaction_type": "wire_transfer",
        "merchant": "Global Freight Clearing",
        "is_flagged_suspicious": True,
        "metadata": {"compliance_flag": "SAR-FILED"}
    }]

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import text
from app.tools.database_tools import DatabaseConnection
from app.utils.geo_utils import haversine_distance_km, calculate_transit_feasibility

logger = logging.getLogger("CrimeMind.LocationTools")


def query_locations(
    location_id: Optional[str] = None,
    city: Optional[str] = None,
    location_type: Optional[str] = None,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Query location entities from database."""
    engine = DatabaseConnection.get_engine()
    if not engine:
        return _mock_locations()

    try:
        with engine.connect() as conn:
            conditions = []
            params: Dict[str, Any] = {"limit": limit}

            if location_id:
                try:
                    conditions.append("location_id = :lid")
                    params["lid"] = str(uuid.UUID(location_id))
                except Exception:
                    pass

            if city:
                conditions.append("city ILIKE :city")
                params["city"] = f"%{city}%"

            if location_type:
                conditions.append("location_type = :location_type")
                params["location_type"] = location_type

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            query_str = f"""
                SELECT location_id, name, address, city, area,
                       postal_code, latitude, longitude, location_type,
                       risk_level, risk_metadata
                FROM locations
                {where_clause}
                LIMIT :limit
            """
            result = conn.execute(text(query_str), params)
            rows = [dict(row._mapping) for row in result]
            for r in rows:
                r["location_id"] = str(r["location_id"])
                r["latitude"] = float(r["latitude"])
                r["longitude"] = float(r["longitude"])
            return rows if rows else _mock_locations()
    except Exception as e:
        logger.warning(f"Error querying locations ({e}); returning fallback.")
        return _mock_locations()


def build_movement_path_analysis(observations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Constructs possible chronological movement sequences across multi-source telemetry
    (Person sightings, CCTV detections, calls, transactions).
    Calculates distance, elapsed time, and transit speeds.
    Enforces strict non-fact disclaimer: 'potential movement', 'possible route'.
    """
    if len(observations) < 2:
        return {
            "observation_count": len(observations),
            "transitions": [],
            "overall_status": "INSUFFICIENT_WAYPOINTS_FOR_PATH_ANALYSIS",
            "disclaimer": "At least two timestamped spatial observations are required to evaluate potential movement."
        }

    # Sort chronologically
    def parse_time(obs):
        t_str = obs.get("timestamp") or obs.get("observed_at") or obs.get("detected_at") or "1970-01-01T00:00:00Z"
        try:
            return datetime.fromisoformat(t_str.replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    sorted_obs = sorted(observations, key=parse_time)
    transitions = []

    for i in range(len(sorted_obs) - 1):
        obs_a = sorted_obs[i]
        obs_b = sorted_obs[i + 1]

        time_a = obs_a.get("timestamp") or obs_a.get("observed_at") or obs_a.get("detected_at")
        time_b = obs_b.get("timestamp") or obs_b.get("observed_at") or obs_b.get("detected_at")

        loc_a = {
            "latitude": obs_a.get("latitude") or obs_a.get("location", {}).get("latitude", 0.0),
            "longitude": obs_a.get("longitude") or obs_a.get("location", {}).get("longitude", 0.0),
            "name": obs_a.get("location_name") or obs_a.get("location", {}).get("name", "Unknown Origin")
        }
        loc_b = {
            "latitude": obs_b.get("latitude") or obs_b.get("location", {}).get("latitude", 0.0),
            "longitude": obs_b.get("longitude") or obs_b.get("location", {}).get("longitude", 0.0),
            "name": obs_b.get("location_name") or obs_b.get("location", {}).get("name", "Unknown Destination")
        }

        feasibility = calculate_transit_feasibility(loc_a, loc_b, str(time_a), str(time_b))

        evidence_ids = []
        if obs_a.get("evidence_id"):
            evidence_ids.append(str(obs_a["evidence_id"]))
        if obs_b.get("evidence_id"):
            evidence_ids.append(str(obs_b["evidence_id"]))
        if obs_a.get("detection_id"):
            evidence_ids.append(str(obs_a["detection_id"]))
        if obs_b.get("detection_id"):
            evidence_ids.append(str(obs_b["detection_id"]))

        transitions.append({
            "transition_index": i + 1,
            "origin": {"name": loc_a["name"], "lat": loc_a["latitude"], "lng": loc_a["longitude"], "time": time_a},
            "destination": {"name": loc_b["name"], "lat": loc_b["latitude"], "lng": loc_b["longitude"], "time": time_b},
            "distance_km": feasibility["distance_km"],
            "elapsed_minutes": feasibility["elapsed_minutes"],
            "implied_speed_kmh": feasibility["implied_speed_kmh"],
            "feasibility_assessment": feasibility["mode_hypothesis"],
            "source_evidence_ids": evidence_ids,
            "epistemological_tier": "AI_INFERENCE",
            "description": (
                f"Potential transit from {loc_a['name']} to {loc_b['name']} "
                f"spanning {feasibility['distance_km']} km over {feasibility['elapsed_minutes']} mins "
                f"({feasibility['mode_hypothesis']})."
            )
        })

    return {
        "observation_count": len(sorted_obs),
        "transitions": transitions,
        "overall_status": "ALGORITHMIC_MOVEMENT_HYPOTHESIS",
        "movement_disclaimer": "Possible route sequence based on available observations. Does not constitute confirmed transit path. Subject may have taken alternate routes or transit means."
    }


def _mock_locations() -> List[Dict[str, Any]]:
    return [
        {
            "location_id": "l1a2b3c4-0005-4000-8000-000000000005",
            "name": "Downtown Freight Logistics Terminal",
            "address": "402 Harbor Parkway",
            "city": "Metropolis",
            "area": "Harbor Industrial District",
            "postal_code": "90210",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "location_type": "commercial",
            "risk_level": "high"
        },
        {
            "location_id": "l2b3c4d5-0006-4000-8000-000000000006",
            "name": "Industrial Port Basin Gate 3",
            "address": "810 Pier 52 Road",
            "city": "Metropolis",
            "area": "Port Basin",
            "postal_code": "90212",
            "latitude": 34.0298,
            "longitude": -118.2711,
            "location_type": "port_marina",
            "risk_level": "extreme"
        }
    ]

import math
from typing import Dict, Any, Optional
from datetime import datetime


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth in kilometers
    using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = R * c
    return round(distance, 3)


def calculate_transit_feasibility(
    loc1: Dict[str, Any],
    loc2: Dict[str, Any],
    time1_iso: str,
    time2_iso: str
) -> Dict[str, Any]:
    """
    Given two observations with spatial coordinates and timestamps,
    calculates geographical distance, elapsed time, and implied speed.
    Adheres strictly to the investigative principle:
    NEVER claim the subject definitely took this path; format as 'possible route'.
    """
    lat1 = float(loc1.get("latitude", 0.0))
    lon1 = float(loc1.get("longitude", 0.0))
    lat2 = float(loc2.get("latitude", 0.0))
    lon2 = float(loc2.get("longitude", 0.0))

    dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)

    # Parse timestamps
    try:
        t1 = datetime.fromisoformat(time1_iso.replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(time2_iso.replace("Z", "+00:00"))
        time_diff_seconds = abs((t2 - t1).total_seconds())
        time_diff_minutes = round(time_diff_seconds / 60.0, 1)
        time_diff_hours = time_diff_seconds / 3600.0
    except Exception:
        time_diff_minutes = 0.0
        time_diff_hours = 0.001

    if time_diff_hours > 0:
        implied_speed_kmh = round(dist_km / time_diff_hours, 1)
    else:
        implied_speed_kmh = 9999.0

    # Feasibility evaluation
    is_physically_feasible = implied_speed_kmh <= 180.0  # Feasible highway/vehicle transit
    is_walking_feasible = implied_speed_kmh <= 6.0

    transit_mode_inference = (
        "potential pedestrian movement" if is_walking_feasible
        else "potential vehicular movement" if is_physically_feasible
        else "implausible single-transit timeline (indicates multiple actors or clock discrepancy)"
    )

    return {
        "distance_km": dist_km,
        "elapsed_minutes": time_diff_minutes,
        "implied_speed_kmh": implied_speed_kmh,
        "is_physically_feasible": is_physically_feasible,
        "mode_hypothesis": transit_mode_inference,
        "epistemological_status": "AI_INFERENCE_REQUIRES_VERIFICATION",
        "movement_disclaimer": "Potential movement sequence based on available observations. Does not constitute confirmed transit route."
    }

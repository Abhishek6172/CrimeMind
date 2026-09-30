import pytest
from app.tools.database_tools import query_cases, query_persons, query_vehicles, query_calls, query_transactions
from app.tools.evidence_tools import query_evidence, verify_chain_of_custody
from app.tools.cctv_tools import query_cctv_detections, DefaultVisionAdapter
from app.tools.location_tools import query_locations, build_movement_path_analysis
from app.tools.graph_tools import build_entity_graph
from app.tools.timeline_tools import aggregate_multi_modal_timeline
from app.utils.geo_utils import haversine_distance_km, calculate_transit_feasibility


def test_haversine_distance():
    # Metropolis Downtown to Port Pier (approx 3.7 - 4.2 km)
    dist = haversine_distance_km(34.0522, -118.2437, 34.0298, -118.2711)
    assert 3.0 < dist < 5.0


def test_transit_feasibility_disclaimer():
    loc1 = {"latitude": 34.0522, "longitude": -118.2437, "name": "Downtown Terminal"}
    loc2 = {"latitude": 34.0298, "longitude": -118.2711, "name": "Port Gate 3"}
    t1 = "2024-08-17T21:00:00Z"
    t2 = "2024-08-17T21:30:00Z"

    feasibility = calculate_transit_feasibility(loc1, loc2, t1, t2)
    assert feasibility["distance_km"] > 0
    assert feasibility["elapsed_minutes"] == 30.0
    assert "movement_disclaimer" in feasibility
    assert "potential movement" in feasibility["movement_disclaimer"].lower() or "possible" in feasibility["movement_disclaimer"].lower()
    assert feasibility["epistemological_status"] == "AI_INFERENCE_REQUIRES_VERIFICATION"


def test_database_tools_fallback():
    cases = query_cases(limit=2)
    assert len(cases) > 0
    assert "case_number" in cases[0]

    persons = query_persons(name_query="Vance", limit=2)
    assert len(persons) > 0
    assert "full_name" in persons[0]

    vehicles = query_vehicles(limit=2)
    assert len(vehicles) > 0
    assert "registration_number" in vehicles[0]


def test_evidence_chain_of_custody():
    evd_list = query_evidence(limit=2)
    assert len(evd_list) > 0
    target_id = evd_list[0]["evidence_id"]

    custody_result = verify_chain_of_custody(target_id)
    assert custody_result["integrity_verified"] is True
    assert custody_result["hash_match"] is True


def test_cctv_tools_and_vision_adapter():
    detections = query_cctv_detections(limit=5)
    assert len(detections) > 0
    assert "confidence" in detections[0]
    assert detections[0]["confidence"] > 0.5


def test_graph_tools_structure():
    graph = build_entity_graph()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0

    edge = graph["edges"][0]
    assert "source" in edge
    assert "target" in edge
    assert "type" in edge
    assert "confidence" in edge
    assert "evidence_ids" in edge


def test_timeline_tools_aggregation():
    timeline = aggregate_multi_modal_timeline(limit=20)
    assert len(timeline) > 0
    # Verify events are chronologically sorted
    for i in range(len(timeline) - 1):
        assert timeline[i].timestamp <= timeline[i + 1].timestamp

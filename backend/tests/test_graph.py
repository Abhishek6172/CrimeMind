import pytest


def test_case_graph_generation(client):
    case_res = client.post("/api/cases", json={
        "title": "Graph Topology Test Case",
        "description": "Validating multi-entity relationship graph",
        "crime_type": "Syndicate Conspiracy"
    })
    case_id = case_res.json()["case_id"]

    graph_res = client.get(f"/api/graph/{case_id}")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert graph["total_nodes"] >= 1
    # Check that root case node exists
    case_nodes = [n for n in graph["nodes"] if n["type"] == "CASE"]
    assert len(case_nodes) == 1

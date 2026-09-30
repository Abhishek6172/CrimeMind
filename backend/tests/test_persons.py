import pytest


def test_create_and_get_person(client):
    payload = {
        "first_name": "Marcus",
        "last_name": "Vance",
        "aliases": ["Viper", "The Snake"],
        "risk_level": "extreme",
        "occupation": "Logistics Contractor",
        "description": "High-priority syndicate coordinator."
    }
    response = client.post("/api/persons", json=payload)
    assert response.status_code == 201
    person_data = response.json()
    assert person_data["full_name"] == "Marcus Vance"
    assert "SYN-ID-" in person_data["national_id_synthetic"]

    person_id = person_data["person_id"]

    # Retrieve detail
    get_res = client.get(f"/api/persons/{person_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["full_name"] == "Marcus Vance"
    assert "linked_cases" in detail
    assert "known_associates" in detail


def test_person_connections_graph(client):
    create_res = client.post("/api/persons", json={
        "first_name": "Julian",
        "last_name": "Drake",
        "risk_level": "high"
    })
    person_id = create_res.json()["person_id"]

    conn_res = client.get(f"/api/persons/{person_id}/connections")
    assert conn_res.status_code == 200
    graph = conn_res.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 1

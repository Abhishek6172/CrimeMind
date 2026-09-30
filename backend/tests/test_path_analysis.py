import pytest


def test_path_analysis_safeguards(client):
    person_res = client.post("/api/persons", json={
        "first_name": "Damian",
        "last_name": "Cross",
        "risk_level": "high"
    })
    person_id = person_res.json()["person_id"]

    path_res = client.get(f"/api/locations/path-analysis/{person_id}")
    assert path_res.status_code == 200
    data = path_res.json()

    # Mandatory Legal Safeguard Check
    assert data["status"] == "AI_INFERENCE_REQUIRES_VERIFICATION"
    assert "observations" in data
    assert "possible_paths" in data
    assert "disclaimer" in data
    assert "requires verification" in data["disclaimer"].lower() or "requires verification" in data["status"].lower()

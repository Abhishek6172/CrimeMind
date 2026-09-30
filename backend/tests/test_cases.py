import uuid
import pytest


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "CrimeMind" in data["system"]


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_create_and_get_case(client):
    payload = {
        "title": "First National Vault Breach Test",
        "description": "Explosive cutting torch breach on vault door #3.",
        "status": "under_investigation",
        "priority": "critical",
        "crime_type": "Armed Robbery"
    }
    response = client.post("/api/cases", json=payload)
    assert response.status_code == 201
    case_data = response.json()
    assert case_data["title"] == payload["title"]
    assert "CASE-" in case_data["case_number"]

    case_id = case_data["case_id"]

    # Fetch detail
    get_res = client.get(f"/api/cases/{case_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["title"] == payload["title"]
    assert "persons" in detail
    assert "evidence" in detail


def test_update_case(client):
    create_res = client.post("/api/cases", json={
        "title": "Initial Title",
        "description": "Initial description",
        "crime_type": "Theft",
        "priority": "low"
    })
    case_id = create_res.json()["case_id"]

    patch_res = client.patch(f"/api/cases/{case_id}", json={
        "title": "Updated Title",
        "priority": "high"
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "Updated Title"
    assert updated["priority"] == "high"

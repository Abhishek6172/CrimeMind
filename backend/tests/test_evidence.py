import io
import pytest


def test_evidence_intake_and_upload(client):
    # 1. Create a dummy case first
    case_res = client.post("/api/cases", json={
        "title": "Evidence Ingestion Test Case",
        "description": "Testing cryptographic pipeline",
        "crime_type": "Digital Forensics"
    })
    case_id = case_res.json()["case_id"]

    # 2. Upload synthetic evidence file
    file_content = b"CRIME SCENE FORENSIC LOG: Audio sample recorded at 433.92 MHz."
    test_file = io.BytesIO(file_content)

    upload_res = client.post(
        "/api/evidence/upload",
        data={
            "case_id": case_id,
            "title": "Audio Intercept #4B",
            "evidence_type": "audio",
            "source": "Field Wiretap Unit"
        },
        files={"file": ("intercept_04.wav", test_file, "audio/wav")}
    )

    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["title"] == "Audio Intercept #4B"
    assert "sha256_hash" in upload_data
    assert len(upload_data["sha256_hash"]) == 64
    assert upload_data["ai_status"] == "completed"

    evidence_id = upload_data["evidence_id"]

    # 3. Retrieve evidence record
    get_res = client.get(f"/api/evidence/{evidence_id}")
    assert get_res.status_code == 200
    ev_record = get_res.json()
    assert ev_record["hash"] == upload_data["sha256_hash"]
    assert len(ev_record["chain_of_custody"]) >= 1

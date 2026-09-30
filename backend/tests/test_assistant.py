import pytest


def test_assistant_chat_non_streaming(client):
    payload = {
        "message": "Summarize known associates of Marcus Vance",
        "stream": False
    }
    response = client.post("/api/assistant/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "message" in data
    assert len(data["sources"]) >= 1


def test_assistant_transcribe(client):
    payload = {
        "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
        "language": "en"
    }
    response = client.post("/api/assistant/transcribe", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data
    assert data["confidence"] > 0.8


def test_assistant_speak(client):
    payload = {
        "text": "Target sighted at Sector 4."
    }
    response = client.post("/api/assistant/speak", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "audio_base64" in data
    assert data["format"] == "audio/mp3"

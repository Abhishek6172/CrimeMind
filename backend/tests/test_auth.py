import pytest
from unittest.mock import patch
from app.config import settings


def test_get_google_config(client):
    """Test public Google OAuth configuration endpoint."""
    response = client.get("/api/auth/google/config")
    assert response.status_code == 200
    data = response.json()
    assert data["client_id"] == settings.GOOGLE_CLIENT_ID
    assert data["project_id"] == settings.GOOGLE_PROJECT_ID
    assert "redirect_uri" in data
    assert "auth_uri" in data


def test_get_google_authorization_url(client):
    """Test generating Google OAuth authorization URL."""
    response = client.get("/api/auth/google/url")
    assert response.status_code == 200
    data = response.json()
    assert "authorization_url" in data
    assert "state" in data
    assert settings.GOOGLE_CLIENT_ID in data["authorization_url"]
    assert "accounts.google.com" in data["authorization_url"]


def test_local_login_demo_user(client):
    """Test authenticating demo investigator credentials."""
    response = client.post(
        "/api/auth/login",
        json={"username": "investigator", "password": "anypassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["username"] == "investigator"
    assert data["role"] == "investigator"
    assert "crimemind_session" in response.cookies


def test_local_login_invalid_user(client):
    """Test authenticating non-existent user."""
    response = client.post(
        "/api/auth/login",
        json={"username": "nonexistent_officer_xyz", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_google_id_token_empty_payload(client):
    """Test submitting empty Google credential fails validation."""
    response = client.post(
        "/api/auth/google",
        json={"credential": ""}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_google_id_token_successful_auth(client):
    """Test authenticating a cryptographically verified Google ID token."""
    mock_google_payload = {
        "sub": "109876543210987654321",
        "email": "sarah.vance@crimemind.internal",
        "email_verified": True,
        "name": "Det. Sarah Vance",
        "picture": "https://lh3.googleusercontent.com/a/mock_avatar",
        "given_name": "Sarah",
        "family_name": "Vance",
        "aud": settings.GOOGLE_CLIENT_ID,
        "iss": "https://accounts.google.com",
    }

    with patch("app.services.google_auth_service.GoogleAuthService.verify_id_token", return_value=mock_google_payload):
        response = client.post(
            "/api/auth/google",
            json={"credential": "mock_google_id_token_jwt"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "sarah.vance@crimemind.internal"
        assert data["provider"] == "google"
        assert "access_token" in data
        assert "crimemind_session" in response.cookies


def test_logout_endpoint(client):
    """Test investigator logout and cookie clearing."""
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "logged_out"

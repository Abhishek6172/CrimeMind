import logging
import secrets
import random
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.config import settings
from app.models.user import User
from app.utils.security import get_password_hash

logger = logging.getLogger("crimemind.google_auth")


class GoogleAuthService:
    """Enterprise Google OAuth 2.0 and Google Identity Services engine."""

    @staticmethod
    def get_public_config() -> Dict[str, str]:
        """Return non-sensitive public Google OAuth configuration for client initialization."""
        return {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "project_id": settings.GOOGLE_PROJECT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "auth_uri": settings.GOOGLE_AUTH_URI,
        }

    @staticmethod
    def generate_authorization_url(redirect_uri: Optional[str] = None, state: Optional[str] = None) -> Dict[str, str]:
        """
        Generate Google OAuth 2.0 authorization URL with anti-CSRF state token.
        """
        csrf_state = state or secrets.token_urlsafe(32)
        effective_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": effective_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": csrf_state,
            "access_type": "offline",
            "prompt": "select_account",
        }

        from urllib.parse import urlencode
        query_string = urlencode(params)
        auth_url = f"{settings.GOOGLE_AUTH_URI}?{query_string}"

        return {
            "authorization_url": auth_url,
            "state": csrf_state,
            "redirect_uri": effective_redirect_uri
        }

    @staticmethod
    async def verify_id_token(token_str: str) -> Dict[str, Any]:
        """
        Cryptographically verify Google ID Token (JWT) against Google public certificate endpoints.
        Enforces audience, issuer, expiration, and verified email status.
        """
        if not token_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google credential/ID token is required."
            )

        payload: Optional[Dict[str, Any]] = None

        # 1. Primary verification using Google Auth SDK
        try:
            req = google_requests.Request()
            payload = google_id_token.verify_oauth2_token(
                token_str,
                req,
                settings.GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10
            )
        except Exception as primary_err:
            logger.warning(f"SDK token verification error: {primary_err}. Attempting direct Google tokeninfo fallback...")

            # 2. Resilient fallback via Google TokenInfo endpoint
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        "https://oauth2.googleapis.com/tokeninfo",
                        params={"id_token": token_str}
                    )
                    if resp.status_code == 200:
                        payload = resp.json()
                    else:
                        logger.error(f"Google TokenInfo rejected token: {resp.text}")
            except Exception as net_err:
                logger.error(f"Network error querying Google TokenInfo: {net_err}")

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google ID token signature or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 3. Security Assertions
        aud = payload.get("aud")
        if aud != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token audience mismatch. Expected {settings.GOOGLE_CLIENT_ID}, received {aud}"
            )

        iss = payload.get("iss", "")
        if iss not in ["accounts.google.com", "https://accounts.google.com"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token issuer mismatch. Unrecognized issuer: {iss}"
            )

        email = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token payload does not contain an email address."
            )

        email_verified = payload.get("email_verified")
        if email_verified is False or str(email_verified).lower() == "false":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Google email address has not been verified by Google."
            )

        return {
            "sub": payload.get("sub"),
            "email": email.lower().strip(),
            "email_verified": True,
            "name": payload.get("name") or email.split("@")[0].capitalize(),
            "picture": payload.get("picture"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
        }

    @staticmethod
    async def exchange_authorization_code(
        code: str,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange OAuth 2.0 authorization code at Google Token endpoint for tokens.
        """
        if not settings.GOOGLE_CLIENT_SECRET or settings.GOOGLE_CLIENT_SECRET.startswith("REPLACE_"):
            logger.warning("GOOGLE_CLIENT_SECRET is unset or placeholder. Ensure valid secret in .env.")

        effective_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET or "",
            "redirect_uri": effective_redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(settings.GOOGLE_TOKEN_URI, data=data)

            if resp.status_code != 200:
                logger.error(f"Google token exchange failed ({resp.status_code}): {resp.text}")
                error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                error_desc = error_data.get("error_description") or error_data.get("error") or "Failed to exchange authorization code with Google"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth token exchange error: {error_desc}"
                )

            token_data = resp.json()
            id_token_str = token_data.get("id_token")

            if not id_token_str:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Google token response did not contain an id_token."
                )

            # Verify the received ID token
            verified_user = await GoogleAuthService.verify_id_token(id_token_str)
            return {
                "verified_user": verified_user,
                "raw_tokens": token_data
            }

    @staticmethod
    def sync_google_user(db: Optional[Session], user_info: Dict[str, Any]) -> Any:
        """
        Find existing user or create a new investigator profile linked with Google credentials.
        """
        email = user_info["email"]
        sub = user_info["sub"]
        name = user_info.get("name") or email.split("@")[0].capitalize()
        picture = user_info.get("picture")

        if db is not None:
            try:
                # 1. Search existing user by email
                existing_user = db.query(User).filter(User.email == email).first()

                if existing_user:
                    # Update metadata and last login
                    existing_user.last_login_at = datetime.utcnow()
                    metadata = dict(existing_user.auth_metadata or {})
                    metadata["google_sub"] = sub
                    if picture:
                        metadata["picture"] = picture
                    metadata["provider"] = "google"
                    metadata["last_google_auth"] = datetime.utcnow().isoformat()
                    existing_user.auth_metadata = metadata

                    db.commit()
                    db.refresh(existing_user)
                    logger.info(f"Existing user authenticated with Google: {existing_user.username} ({existing_user.email})")
                    return existing_user

                # 2. Check if username derived from email is available
                base_username = email.split("@")[0].lower()
                clean_username = "".join(c for c in base_username if c.isalnum() or c in "_-")[:30]
                candidate_username = clean_username or f"agent_{sub[:6]}"

                collision = db.query(User).filter(User.username == candidate_username).first()
                if collision:
                    candidate_username = f"{clean_username}_{secrets.token_hex(2)}"

                # 3. Create new Investigator user
                random_badge = f"{random.randint(1000, 9999)}"
                new_user = User(
                    user_id=uuid.uuid4(),
                    username=candidate_username,
                    email=email,
                    password_hash=get_password_hash(secrets.token_urlsafe(32)),  # Random non-guessable hash
                    full_name=name,
                    badge_number=random_badge,
                    role="investigator",
                    department="Criminal Investigation Division",
                    is_active=True,
                    last_login_at=datetime.utcnow(),
                    auth_metadata={
                        "google_sub": sub,
                        "picture": picture,
                        "provider": "google",
                        "linked_at": datetime.utcnow().isoformat()
                    },
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                logger.info(f"Created new user via Google Sign-In: {new_user.username} ({new_user.email})")
                return new_user

            except Exception as db_err:
                logger.error(f"Database error while syncing Google user: {db_err}")
                if db:
                    db.rollback()

        # Resilient Standby Mode (if database connection is down or in memory demo)
        mock_id = uuid.uuid5(uuid.NAMESPACE_DNS, email)
        logger.warning(f"Standby user synthesized for Google identity: {email}")
        return User(
            user_id=mock_id,
            username=email.split("@")[0].lower(),
            email=email,
            password_hash="[GOOGLE_OAUTH_PROTECTED]",
            full_name=name,
            badge_number=f"G-{sub[-4:]}",
            role="investigator",
            department="Criminal Investigation Division",
            is_active=True,
            last_login_at=datetime.utcnow(),
            auth_metadata={"google_sub": sub, "picture": picture, "provider": "google"}
        )

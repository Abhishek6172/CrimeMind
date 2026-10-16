from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class RoleEnum(str, Enum):
    ADMIN = "administrator"
    INVESTIGATOR = "investigator"
    ANALYST = "analyst"
    SUPERVISOR = "supervisor"
    FORENSIC_SPECIALIST = "forensic_specialist"
    VIEWER = "analyst"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: UUID
    username: str
    email: Optional[str] = None
    role: str
    full_name: str
    badge_number: Optional[str] = None
    picture: Optional[str] = None
    provider: Optional[str] = "local"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class UserLogin(BaseModel):
    username: str  # Can be username or email address
    password: str


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None  # Google Identity Services One Tap / button credential JWT
    id_token: Optional[str] = None    # Direct ID token


class GoogleCodeRequest(BaseModel):
    code: str
    state: Optional[str] = None
    redirect_uri: Optional[str] = None


class GoogleAuthUrlResponse(BaseModel):
    authorization_url: str
    state: str
    redirect_uri: str


class GooglePublicConfig(BaseModel):
    client_id: str
    project_id: str
    redirect_uri: str
    auth_uri: str


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    badge_number: Optional[str] = None
    role: RoleEnum = RoleEnum.INVESTIGATOR
    department: str = "Criminal Investigation Division"


class UserResponse(BaseModel):
    user_id: UUID
    username: str
    email: str
    full_name: str
    badge_number: Optional[str] = None
    picture: Optional[str] = None
    role: str
    department: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    APP_NAME: str = "CrimeMind Intelligence API"
    APP_VERSION: str = "2.4.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crimemind"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # JWT Authentication
    JWT_SECRET_KEY: str = "crimemind-super-secret-fips140-cryptographic-vault-key-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        import json
        return json.loads(v)

    # File uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: set = {
        "pdf", "docx", "txt", "csv", "json", "jpg", "jpeg", "png", "mp4", "wav", "mp3"
    }

    # LangGraph & AI
    AI_CONFIDENCE_THRESHOLD: float = 0.75
    ENABLE_SYNTHETIC_LLM_STREAM: bool = True
    LANGGRAPH_MAX_AGENT_RETRIES: int = 3

    # External AI & Geospatial APIs
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_BASE_URL: Optional[str] = "https://generativelanguage.googleapis.com/v1beta/openai/"
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: Optional[str] = "https://openrouter.ai/api/v1"
    MAPBOX_ACCESS_TOKEN: Optional[str] = None

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 120


settings = Settings()

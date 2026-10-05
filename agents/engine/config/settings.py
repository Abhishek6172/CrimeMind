import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict


class AgentSettings(BaseSettings):
    """
    Configuration settings for CrimeMind LangGraph Multi-Agent Engine.
    Supports dynamic loading from environment variables or .env file.
    """
    # Database configuration
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/crimemind",
        description="PostgreSQL connection string for CrimeMind database"
    )

    # Multi-LLM Provider Architecture Configuration
    DEFAULT_LLM_PROVIDER: str = Field(
        default="gemini",
        description="Default provider: 'gemini', 'openai', 'anthropic', 'openrouter', 'local', or 'mock'"
    )

    # Assigned Models per Investigative Role
    PLANNER_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model assigned to query planning and task decomposition"
    )
    REASONING_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model assigned to deep cross-case, relationship and timeline reasoning"
    )
    EXTRACTION_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model assigned to entity and statement fact extraction"
    )
    SYNTHESIS_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model assigned to final multi-agent investigative report synthesis"
    )
    VISION_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model assigned to optical CCTV and image evidence analysis"
    )
    EMBEDDING_MODEL: str = Field(
        default="text-embedding-004",
        description="Model assigned to vector embeddings and semantic search"
    )

    # Provider API Keys & Base URLs
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API Key")
    GEMINI_BASE_URL: Optional[str] = Field(
        default="https://generativelanguage.googleapis.com/v1beta/openai/",
        description="Google Gemini REST or OpenAI-compatible base URL"
    )
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, description="Anthropic API Key")
    OPENROUTER_API_KEY: Optional[str] = Field(default=None, description="OpenRouter API Key")
    OPENROUTER_BASE_URL: Optional[str] = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API Base URL"
    )
    MAPBOX_ACCESS_TOKEN: Optional[str] = Field(default=None, description="Mapbox Geospatial Access Token")
    LOCAL_LLM_URL: str = Field(
        default="http://localhost:11434",
        description="Local Ollama or vLLM base URL"
    )

    # Agent Execution Boundaries & Safety Controls
    MAX_CONCURRENT_AGENTS: int = Field(default=8, description="Max parallel workers in DAG execution")
    AGENT_TIMEOUT_SECONDS: int = Field(default=45, description="Timeout per agent task execution")
    CONFIDENCE_THRESHOLD: float = Field(default=0.75, description="Minimum confidence for high-certainty findings")
    ENABLE_LEGAL_SAFETY_VERIFICATION: bool = Field(
        default=True,
        description="Enforce constitutional and Fourth Amendment statutory checks"
    )
    ENABLE_STREAMING: bool = Field(default=True, description="Enable token and agent progress streaming")
    LOG_LEVEL: str = Field(default="INFO", description="Console and audit log verbosity")

    # Investigative Constraints
    MAX_GRAPH_HOPS: int = Field(default=3, description="Maximum traversal depth for relationship graphs")
    MAX_TIMELINE_EVENTS: int = Field(default=150, description="Max aggregated chronological timeline points")
    MAX_CROSS_CASE_MATCHES: int = Field(default=25, description="Max matches across historical dossiers")

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = AgentSettings()

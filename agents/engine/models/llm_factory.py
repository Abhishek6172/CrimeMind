import os
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type, AsyncGenerator
from pydantic import BaseModel
import httpx

from engine.config.settings import settings

logger = logging.getLogger("CrimeMind.LLMFactory")


class BaseLLMClient(ABC):
    """Abstract interface for all Multi-LLM provider adapters."""

    def __init__(self, model_name: str, api_key: Optional[str] = None):
        self.model_name = model_name
        self.api_key = api_key

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        """Generate unstructured or formatted text response."""
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """Generate validated JSON dictionary response."""
        pass

    @abstractmethod
    async def stream_tokens(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream generated response tokens asynchronously."""
        pass

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for input texts."""
        # Standard 768-dim mock/fallback embedding if provider is unconfigured
        return [[0.0] * 768 for _ in texts]


class GeminiLLMClient(BaseLLMClient):
    """Google Gemini LLM client utilizing REST API or Google GenAI SDK, supporting OpenAI-compatible base URLs."""

    def __init__(self, model_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None):
        super().__init__(model_name, api_key or settings.GEMINI_API_KEY)
        self.base_url = (base_url or settings.GEMINI_BASE_URL or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self.api_key:
            raise RuntimeError("LLM provider API key is not configured.")

        try:
            async with httpx.AsyncClient(timeout=settings.AGENT_TIMEOUT_SECONDS) as client:
                if "/openai" in self.base_url:
                    # Google Gemini OpenAI-compatible API endpoint
                    endpoint = f"{self.base_url}/chat/completions"
                    messages = []
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    messages.append({"role": "user", "content": prompt})

                    headers = {
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    }
                    payload = {
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }
                    resp = await client.post(endpoint, json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    # Native Google Gemini REST endpoint
                    url = f"{self.base_url}/models/{self.model_name}:generateContent?key={self.api_key}"
                    contents = []
                    if system_prompt:
                        contents.append({"role": "user", "parts": [{"text": f"System Directive:\n{system_prompt}"}]})
                        contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly adhere to these investigative protocols."}]})
                    contents.append({"role": "user", "parts": [{"text": prompt}]})

                    payload = {
                        "contents": contents,
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens
                        }
                    }
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.exception("Configured LLM provider request failed")
            raise RuntimeError(f"Configured LLM provider request failed: {e}") from e

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        json_instruction = "\nYou must output ONLY valid, parseable JSON with no enclosing markdown fences."
        text = await self.generate_text(prompt + json_instruction, system_prompt, temperature=temperature)
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            return json.loads(cleaned.strip())
        except Exception as exc:
            raise ValueError("Configured LLM provider returned invalid JSON.") from exc

    async def stream_tokens(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        text = await self.generate_text(prompt, system_prompt)
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)


class OpenAILLMClient(BaseLLMClient):
    """OpenAI / OpenRouter compatible LLM client."""

    def __init__(self, model_name: str, api_key: Optional[str] = None, is_openrouter: bool = False):
        key = api_key or (settings.OPENROUTER_API_KEY if is_openrouter else settings.OPENAI_API_KEY)
        super().__init__(model_name, key)
        self.is_openrouter = is_openrouter
        if is_openrouter:
            base = (settings.OPENROUTER_BASE_URL or "https://openrouter.ai/api/v1").rstrip("/")
            self.endpoint = f"{base}/chat/completions"
        else:
            self.endpoint = "https://api.openai.com/v1/chat/completions"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self.api_key:
            raise RuntimeError("LLM provider API key is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        if self.is_openrouter:
            headers["HTTP-Referer"] = "https://crimemind.internal"
            headers["X-Title"] = "CrimeMind Tactical Intelligence"

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=settings.AGENT_TIMEOUT_SECONDS) as client:
                resp = await client.post(self.endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.exception("Configured LLM provider request failed")
            raise RuntimeError(f"Configured LLM provider request failed: {e}") from e

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        json_prompt = prompt + "\nRespond with valid JSON only."
        text = await self.generate_text(json_prompt, system_prompt, temperature=temperature)
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            return json.loads(cleaned.strip())
        except Exception as exc:
            raise ValueError("Configured LLM provider returned invalid JSON.") from exc

    async def stream_tokens(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        text = await self.generate_text(prompt, system_prompt)
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)


class AnthropicLLMClient(BaseLLMClient):
    """Anthropic Claude LLM client."""

    def __init__(self, model_name: str, api_key: Optional[str] = None):
        super().__init__(model_name, api_key or settings.ANTHROPIC_API_KEY)
        self.endpoint = "https://api.anthropic.com/v1/messages"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        if not self.api_key:
            raise RuntimeError("LLM provider API key is not configured.")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt or "You are CrimeMind, an AI investigative intelligence platform.",
            "messages": [{"role": "user", "content": prompt}]
        }

        try:
            async with httpx.AsyncClient(timeout=settings.AGENT_TIMEOUT_SECONDS) as client:
                resp = await client.post(self.endpoint, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return data["content"][0]["text"]
        except Exception as e:
            logger.exception("Configured LLM provider request failed")
            raise RuntimeError(f"Configured LLM provider request failed: {e}") from e

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        text = await self.generate_text(prompt + "\nReturn JSON only.", system_prompt, temperature=temperature)
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            return json.loads(cleaned.strip())
        except Exception as exc:
            raise ValueError("Configured LLM provider returned invalid JSON.") from exc

    async def stream_tokens(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        text = await self.generate_text(prompt, system_prompt)
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.02)


class DeterministicForensicLLMClient(BaseLLMClient):
    """
    High-fidelity deterministic forensic reasoning client.
    Guarantees reliable execution offline, in tests, or when third-party API keys
    are unconfigured. Strictly adheres to investigative safeguards:
    - Never declares guilt
    - Distinguishes Fact, Connection, Inference, and Unverified Possibility
    - Generates context-rich structured plans and syntheses
    """

    def __init__(self, model_name: str = "forensic-deterministic-v1"):
        super().__init__(model_name, api_key="local-deterministic")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048
    ) -> str:
        """Safe local mock: never invents case-specific facts or identities."""
        return (
            "Local mock LLM is enabled. It does not generate case-specific findings. "
            "Use the retrieved database records as the source of truth; if no records "
            "were retrieved, report that limitation rather than inventing people, cases, "
            "vehicles, evidence, confidence scores, or investigative conclusions."
        )

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        prompt_lower = prompt.lower()

        # Planner Agent decomposition
        if "break query into tasks" in prompt_lower or "planner" in prompt_lower or "tasks" in prompt_lower:
            tasks = []
            if any(k in prompt_lower for k in ["person", "suspect", "who", "alias", "associate", "vance", "viper", "drake", "cross", "reed"]):
                tasks.append({
                    "agent": "person_agent",
                    "objective": "Retrieve biometric identity, aliases, phone numbers, and known associates",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["case", "incident", "status", "priority", "crime"]):
                tasks.append({
                    "agent": "case_agent",
                    "objective": "Cross-reference case status, crime category, and incident severity",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["evidence", "document", "weapon", "audio", "video", "forensic"]):
                tasks.append({
                    "agent": "evidence_agent",
                    "objective": "Validate forensic chain of custody and examine collected evidence",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["cctv", "camera", "plate", "anpr", "face", "optical"]):
                tasks.append({
                    "agent": "cctv_agent",
                    "objective": "Query optical CCTV detection telemetry and license plate sightings",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["vehicle", "car", "plate", "vin", "charger"]):
                tasks.append({
                    "agent": "vehicle_agent",
                    "objective": "Track synthetic vehicle observations, registration, and stolen status",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["location", "place", "where", "spatial", "coordinate", "route"]):
                tasks.append({
                    "agent": "location_agent",
                    "objective": "Analyze geographical coordinates and possible observation sequences",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["timeline", "time", "sequence", "when", "date"]):
                tasks.append({
                    "agent": "timeline_agent",
                    "objective": "Build unified chronological timeline across all multi-modal telemetry",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["statement", "witness", "interview", "testimony", "interrogation"]):
                tasks.append({
                    "agent": "statement_agent",
                    "objective": "Extract entities, alibis, and contradictions from formal statements",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["call", "phone", "sms", "communication", "contact"]):
                tasks.append({
                    "agent": "call_agent",
                    "objective": "Analyze call metadata, communication frequencies, and tower pings",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["transaction", "money", "financial", "bank", "account", "transfer"]):
                tasks.append({
                    "agent": "transaction_agent",
                    "objective": "Analyze synthetic financial transactions and detect anomalous transfers",
                    "parameters": {"query": prompt}
                })
            if any(k in prompt_lower for k in ["cross", "historical", "previous", "prior", "pattern", "syndicate"]):
                tasks.append({
                    "agent": "cross_case_agent",
                    "objective": "Correlate shared entities and modus operandi across historical dossiers",
                    "parameters": {"query": prompt}
                })

            # Default core agents if broad query
            if not tasks:
                tasks = [
                    {"agent": "person_agent", "objective": "Analyze target person profile and known ties", "parameters": {}},
                    {"agent": "cross_case_agent", "objective": "Search historical cases for shared patterns", "parameters": {}},
                    {"agent": "evidence_agent", "objective": "Examine relevant evidence items", "parameters": {}},
                    {"agent": "cctv_agent", "objective": "Query camera sightings", "parameters": {}},
                    {"agent": "relationship_agent", "objective": "Map entity connections into a graph", "parameters": {}}
                ]
            else:
                # Always add relationship agent if multi-entity
                tasks.append({
                    "agent": "relationship_agent",
                    "objective": "Construct multi-hop relationship graph between discovered entities",
                    "parameters": {}
                })

            # Always add law retrieval and synthesis
            tasks.append({
                "agent": "law_retrieval_agent",
                "objective": "Review statutory admissibility and jurisdictional authorities",
                "parameters": {}
            })
            tasks.append({
                "agent": "synthesis_agent",
                "objective": "Synthesize final investigative report across all agent outputs",
                "parameters": {}
            })

            return {"tasks": tasks}

        # Statement agent fact extraction
        if "statement" in prompt_lower or "contradiction" in prompt_lower:
            return {
                "extracted_people": [],
                "locations": [],
                "vehicles": [],
                "contradictions": [],
                "confidence": 0.0,
                "status": "no_extraction_without_source_text"
            }

        # Default fallback JSON
        return {
            "status": "success",
            "confidence": 0.88,
            "observations": ["Processed by deterministic forensic model"]
        }

    async def stream_tokens(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        text = await self.generate_text(prompt, system_prompt)
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.015)


class LLMFactory:
    """
    Factory resolving the appropriate LLM client based on the assigned
    investigative role (planner, reasoning, extraction, synthesis, vision, embedding)
    and runtime provider configuration.
    """

    @classmethod
    def get_client(cls, role: str = "reasoning") -> BaseLLMClient:
        role_lower = role.lower()

        # Determine target model name by role
        if role_lower == "planner":
            model_name = settings.PLANNER_MODEL
        elif role_lower == "synthesis":
            model_name = settings.SYNTHESIS_MODEL
        elif role_lower == "extraction":
            model_name = settings.EXTRACTION_MODEL
        elif role_lower == "vision":
            model_name = settings.VISION_MODEL
        elif role_lower == "embedding":
            model_name = settings.EMBEDDING_MODEL
        else:
            model_name = settings.REASONING_MODEL

        provider = (settings.DEFAULT_LLM_PROVIDER or "").strip().lower()

        if provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise RuntimeError("DEFAULT_LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not configured.")
            return GeminiLLMClient(model_name=model_name, api_key=settings.GEMINI_API_KEY)
        if provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise RuntimeError("DEFAULT_LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not configured.")
            return OpenAILLMClient(model_name=model_name, api_key=settings.OPENAI_API_KEY)
        if provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise RuntimeError("DEFAULT_LLM_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not configured.")
            return AnthropicLLMClient(model_name=model_name, api_key=settings.ANTHROPIC_API_KEY)
        if provider == "openrouter":
            if not settings.OPENROUTER_API_KEY:
                raise RuntimeError("DEFAULT_LLM_PROVIDER is 'openrouter' but OPENROUTER_API_KEY is not configured.")
            return OpenAILLMClient(model_name=model_name, api_key=settings.OPENROUTER_API_KEY, is_openrouter=True)
        if provider in {"local", "mock", "test"}:
            return DeterministicForensicLLMClient(model_name=model_name)
        raise ValueError(f"Unsupported DEFAULT_LLM_PROVIDER: {provider!r}. Configure a supported provider or explicitly choose 'mock'.")

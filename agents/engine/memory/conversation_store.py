import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    query: str
    timestamp: float = Field(default_factory=time.time)
    plan: List[str] = Field(default_factory=list)
    final_response: str = ""
    discovered_person_ids: List[str] = Field(default_factory=list)
    discovered_vehicle_ids: List[str] = Field(default_factory=list)
    discovered_case_ids: List[str] = Field(default_factory=list)


class ConversationStore:
    """
    Manages multi-turn conversation memory and session context for the investigative assistant.
    Maintains thread context across conversational queries keyed by `conversation_id`.
    """
    _sessions: Dict[str, List[ConversationTurn]] = {}

    @classmethod
    def get_history(cls, conversation_id: str) -> List[ConversationTurn]:
        """Retrieve chronological conversation turns for a given session."""
        return cls._sessions.get(conversation_id, [])

    @classmethod
    def add_turn(
        cls,
        conversation_id: str,
        query: str,
        plan: List[str],
        final_response: str,
        persons: Optional[List[Dict[str, Any]]] = None,
        vehicles: Optional[List[Dict[str, Any]]] = None,
        cases: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Register completed investigative interaction in the session memory."""
        if conversation_id not in cls._sessions:
            cls._sessions[conversation_id] = []

        person_ids = [str(p.get("person_id")) for p in (persons or []) if p.get("person_id")]
        vehicle_ids = [str(v.get("vehicle_id")) for v in (vehicles or []) if v.get("vehicle_id")]
        case_ids = [str(c.get("case_id")) for c in (cases or []) if c.get("case_id")]

        turn = ConversationTurn(
            query=query,
            plan=plan,
            final_response=final_response,
            discovered_person_ids=person_ids,
            discovered_vehicle_ids=vehicle_ids,
            discovered_case_ids=case_ids
        )
        cls._sessions[conversation_id].append(turn)

    @classmethod
    def get_context_entities(cls, conversation_id: str) -> Dict[str, List[str]]:
        """
        Extract accumulated entities (persons, vehicles, cases) referenced in prior turns
        to resolve pronouns and context (e.g. 'Show me his vehicles', 'Compare with that case').
        """
        history = cls.get_history(conversation_id)
        accumulated_persons = set()
        accumulated_vehicles = set()
        accumulated_cases = set()

        for turn in history:
            accumulated_persons.update(turn.discovered_person_ids)
            accumulated_vehicles.update(turn.discovered_vehicle_ids)
            accumulated_cases.update(turn.discovered_case_ids)

        return {
            "person_ids": list(accumulated_persons),
            "vehicle_ids": list(accumulated_vehicles),
            "case_ids": list(accumulated_cases)
        }

    @classmethod
    def clear_session(cls, conversation_id: str) -> None:
        """Clear conversation memory for a session."""
        if conversation_id in cls._sessions:
            del cls._sessions[conversation_id]

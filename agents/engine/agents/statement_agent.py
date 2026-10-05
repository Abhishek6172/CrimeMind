import logging
from typing import Dict, Any, List
from engine.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from engine.models.llm_factory import LLMFactory
from engine.prompts.investigative_prompts import STATEMENT_SYSTEM_PROMPT
from engine.utils.logger import AgentExecutionTimer
from engine.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.StatementAgent")


class StatementAgent:
    """
    Specialized agent analyzing formal depositions, witness statements, and suspect transcripts.
    Extracts entities, alibis, dates, and contradiction signals with explicit citations.
    """
    NAME = "Statement Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        """Fail closed until statements are retrieved from a real configured source."""
        with AgentExecutionTimer(cls.NAME, "Checking statement-source availability") as timer:
            message = (
                "Statement analysis was not performed: this agent currently has no connected statement-record "
                "retrieval source. No witness statement, named person, vehicle, or contradiction was fabricated."
            )
            state.add_error(cls.NAME, message)
            state.add_agent_output(AgentOutputItem(
                agent_name=cls.NAME, task="Statement source availability check", status="partial",
                execution_time_ms=timer.duration_ms, confidence=0.0, findings=[message], errors=message
            ))
        return state

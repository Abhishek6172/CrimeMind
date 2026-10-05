import asyncio
import logging
from typing import Dict, Any, List, Type
from engine.graph.state import InvestigativeState, AgentOutputItem
from engine.agents import (
    PlannerAgent,
    CaseAgent,
    EvidenceAgent,
    PersonAgent,
    RelationshipAgent,
    CCTVAgent,
    VehicleAgent,
    LocationAgent,
    TimelineAgent,
    StatementAgent,
    CallAgent,
    TransactionAgent,
    CrossCaseAgent,
    LawRetrievalAgent,
    SynthesisAgent
)

logger = logging.getLogger("CrimeMind.Routing")

# Canonical mapping of agent identifiers to implementation classes
AGENT_REGISTRY: Dict[str, Any] = {
    "planner_agent": PlannerAgent,
    "case_agent": CaseAgent,
    "evidence_agent": EvidenceAgent,
    "person_agent": PersonAgent,
    "relationship_agent": RelationshipAgent,
    "cctv_agent": CCTVAgent,
    "vehicle_agent": VehicleAgent,
    "location_agent": LocationAgent,
    "timeline_agent": TimelineAgent,
    "statement_agent": StatementAgent,
    "call_agent": CallAgent,
    "transaction_agent": TransactionAgent,
    "cross_case_agent": CrossCaseAgent,
    "law_retrieval_agent": LawRetrievalAgent,
    "synthesis_agent": SynthesisAgent
}

# Stage 1: Retrieval & Extraction nodes (Independently executable in parallel)
STAGE_1_PARALLEL_AGENTS = {
    "case_agent",
    "person_agent",
    "evidence_agent",
    "cctv_agent",
    "vehicle_agent",
    "location_agent",
    "statement_agent",
    "call_agent",
    "transaction_agent"
}

# Stage 2: Correlation & Relational nodes (Require Stage 1 entities)
STAGE_2_CORRELATION_AGENTS = {
    "cross_case_agent",
    "relationship_agent",
    "timeline_agent",
    "law_retrieval_agent"
}


async def run_single_agent_safe(agent_key: str, state: InvestigativeState) -> InvestigativeState:
    """
    Executes a single agent safely. If the agent raises an unhandled exception,
    captures it into state.errors without crashing the overall pipeline.
    """
    agent_cls = AGENT_REGISTRY.get(agent_key)
    if not agent_cls:
        logger.warning(f"Agent '{agent_key}' requested in plan but not found in registry.")
        state.add_error(agent_key, f"Agent '{agent_key}' is not registered.")
        return state

    try:
        logger.info(f"Executing agent node: {agent_key}")
        return await agent_cls.execute(state)
    except Exception as e:
        logger.error(f"Agent {agent_key} failed non-fatally: {e}", exc_info=True)
        state.add_error(agent_key, str(e))
        state.add_agent_output(AgentOutputItem(
            agent_name=getattr(agent_cls, "NAME", agent_key),
            task=f"Execution of {agent_key}",
            status="failed",
            confidence=0.0,
            errors=str(e)
        ))
        return state


async def dispatch_parallel_stage(agent_keys: List[str], state: InvestigativeState) -> InvestigativeState:
    """
    Dispatches multiple agents concurrently using asyncio.gather.
    Merges their updates safely back into the shared state.
    """
    if not agent_keys:
        return state

    logger.info(f"⚡ Dispatching {len(agent_keys)} agents in parallel: {agent_keys}")
    tasks = [run_single_agent_safe(k, state) for k in agent_keys]
    await asyncio.gather(*tasks, return_exceptions=True)
    return state

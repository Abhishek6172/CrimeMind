import asyncio
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime, timezone

from engine.graph.state import InvestigativeState, TaskItem, AgentOutputItem, TimelineItem
from engine.graph.routing import (
    AGENT_REGISTRY,
    STAGE_1_PARALLEL_AGENTS,
    STAGE_2_CORRELATION_AGENTS,
    run_single_agent_safe,
    dispatch_parallel_stage
)
from engine.agents import PlannerAgent, SynthesisAgent
from engine.tools.graph_tools import build_entity_graph
from engine.tools.timeline_tools import aggregate_multi_modal_timeline
from engine.memory.conversation_store import ConversationStore

logger = logging.getLogger("CrimeMind.MasterGraph")


class MasterInvestigativeGraph:
    """
    Master LangGraph Orchestrator for CrimeMind.
    Coordinates query planning, concurrent retrieval, multi-hop relationship mapping,
    cross-case correlation, timeline synchronization, and final epistemological synthesis.
    """

    @classmethod
    async def run_investigation(
        cls,
        query: str,
        case_id: Optional[str] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> InvestigativeState:
        """
        Executes complete multi-agent DAG pipeline from query to final synthesized briefing.
        """
        state = InvestigativeState(
            query=query,
            case_id=case_id,
            user_id=user_id,
            conversation_id=conversation_id or f"conv_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        )

        logger.info(f"▶ Initiating Master Investigation DAG for query: '{query}'")

        # 1. PLANNER AGENT: Query understanding and task decomposition
        state = await PlannerAgent.execute(state)

        # 2. SEPARATE TASKS INTO STAGES
        plan = state.plan or []
        stage_1_agents = [a for a in plan if a in STAGE_1_PARALLEL_AGENTS]
        stage_2_agents = [a for a in plan if a in STAGE_2_CORRELATION_AGENTS]

        # 3. STAGE 1: PARALLEL RETRIEVAL & EXTRACTION
        if stage_1_agents:
            state = await dispatch_parallel_stage(stage_1_agents, state)

        # 4. STAGE 2: PARALLEL CORRELATION & GRAPH REASONING
        if stage_2_agents:
            state = await dispatch_parallel_stage(stage_2_agents, state)

        # 5. STAGE 3: FINAL SYNTHESIS & REPORT GENERATION
        state = await SynthesisAgent.execute(state)

        # 6. REGISTER TURN IN CONVERSATION STORE
        ConversationStore.add_turn(
            conversation_id=state.conversation_id,
            query=query,
            plan=state.plan,
            final_response=state.final_response,
            persons=state.persons,
            vehicles=state.vehicles,
            cases=state.cases
        )

        logger.info(f"✔ Completed Master Investigation DAG with {len(state.agent_outputs)} agent outputs.")
        return state

    @classmethod
    async def stream_investigation(
        cls,
        query: str,
        case_id: Optional[str] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Streams live investigative progress events (agent starts, agent completions,
        and synthesis tokens) suitable for frontend SSE streaming.
        """
        state = InvestigativeState(
            query=query,
            case_id=case_id,
            user_id=user_id,
            conversation_id=conversation_id or f"conv_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        )

        yield {
            "event_type": "pipeline_started",
            "agent_name": "Master Graph",
            "data": {"query": query, "case_id": case_id, "conversation_id": state.conversation_id},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # 1. PLANNER
        yield {
            "event_type": "agent_started",
            "agent_name": "Planner Agent",
            "data": {"task": "Decomposing query into specialized agent tasks"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        state = await PlannerAgent.execute(state)
        yield {
            "event_type": "agent_completed",
            "agent_name": "Planner Agent",
            "data": {"plan": state.plan, "tasks_count": len(state.tasks)},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # 2. PARTITION STAGES
        plan = state.plan or []
        stage_1_agents = [a for a in plan if a in STAGE_1_PARALLEL_AGENTS]
        stage_2_agents = [a for a in plan if a in STAGE_2_CORRELATION_AGENTS]

        # 3. STAGE 1 EXECUTION
        for agent_key in stage_1_agents:
            agent_cls = AGENT_REGISTRY.get(agent_key)
            name = getattr(agent_cls, "NAME", agent_key)
            yield {
                "event_type": "agent_started",
                "agent_name": name,
                "data": {"task": f"Executing {name} telemetry retrieval"},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            state = await run_single_agent_safe(agent_key, state)
            out = state.agent_outputs.get(name)
            yield {
                "event_type": "agent_completed",
                "agent_name": name,
                "data": {"status": out.status if out else "completed", "findings": out.findings if out else []},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # 4. STAGE 2 EXECUTION
        for agent_key in stage_2_agents:
            agent_cls = AGENT_REGISTRY.get(agent_key)
            name = getattr(agent_cls, "NAME", agent_key)
            yield {
                "event_type": "agent_started",
                "agent_name": name,
                "data": {"task": f"Executing {name} cross-correlation"},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            state = await run_single_agent_safe(agent_key, state)
            out = state.agent_outputs.get(name)
            yield {
                "event_type": "agent_completed",
                "agent_name": name,
                "data": {"status": out.status if out else "completed", "findings": out.findings if out else []},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # 5. SYNTHESIS
        yield {
            "event_type": "agent_started",
            "agent_name": "Synthesis Agent",
            "data": {"task": "Deducing final multi-agent investigative briefing"},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        state = await SynthesisAgent.execute(state)

        # Stream synthesis tokens
        words = state.final_response.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield {
                "event_type": "token",
                "agent_name": "Synthesis Agent",
                "data": {"token": token},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await asyncio.sleep(0.015)

        # Final response event
        yield {
            "event_type": "final_synthesis",
            "agent_name": "Synthesis Agent",
            "data": {
                "full_text": state.final_response,
                "confidence": state.confidence,
                "findings": [f.model_dump() for f in state.findings],
                "citations": [c.model_dump() for c in state.citations],
                "status": "REQUIRES HUMAN VERIFICATION"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        ConversationStore.add_turn(
            conversation_id=state.conversation_id,
            query=query,
            plan=state.plan,
            final_response=state.final_response,
            persons=state.persons,
            vehicles=state.vehicles,
            cases=state.cases
        )

    @classmethod
    async def run_agent(
        cls,
        agent_name: str,
        state: Optional[InvestigativeState] = None,
        query: Optional[str] = None
    ) -> InvestigativeState:
        """Directly executes a single specialized agent node."""
        current_state = state or InvestigativeState(query=query or f"Direct execution of {agent_name}")
        normalized_key = agent_name.lower().replace(" ", "_")
        return await run_single_agent_safe(normalized_key, current_state)

    @classmethod
    def build_case_graph(cls, case_id: str) -> Dict[str, Any]:
        """Constructs the relationship subgraph centered on a specific case."""
        return build_entity_graph(entity_ids=[case_id], max_hops=3)

    @classmethod
    def build_person_graph(cls, person_id: str) -> Dict[str, Any]:
        """Constructs the relationship subgraph centered on a specific person/suspect."""
        return build_entity_graph(entity_ids=[person_id], max_hops=3)

    @classmethod
    def build_timeline(cls, case_id: Optional[str] = None, person_id: Optional[str] = None) -> List[TimelineItem]:
        """Aggregates and synchronizes multi-modal chronological timeline events."""
        return aggregate_multi_modal_timeline(case_id=case_id, person_id=person_id, limit=100)


# ==============================================================================
# FASTAPI BACKEND EXPORT INTERFACES
# ==============================================================================
async def run_investigation(
    query: str,
    case_id: Optional[str] = None,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None
) -> InvestigativeState:
    """Primary FastAPI backend entrypoint for complete investigation execution."""
    return await MasterInvestigativeGraph.run_investigation(query, case_id, user_id, conversation_id)


async def stream_investigation(
    query: str,
    case_id: Optional[str] = None,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """Primary FastAPI backend entrypoint for real-time SSE progress streaming."""
    async for event in MasterInvestigativeGraph.stream_investigation(query, case_id, user_id, conversation_id):
        yield event


async def run_agent(
    agent_name: str,
    state: Optional[InvestigativeState] = None,
    query: Optional[str] = None
) -> InvestigativeState:
    """Direct execution interface for individual agents."""
    return await MasterInvestigativeGraph.run_agent(agent_name, state, query)


def build_case_graph(case_id: str) -> Dict[str, Any]:
    """FastAPI backend interface for case network graph."""
    return MasterInvestigativeGraph.build_case_graph(case_id)


def build_person_graph(person_id: str) -> Dict[str, Any]:
    """FastAPI backend interface for person associate graph."""
    return MasterInvestigativeGraph.build_person_graph(person_id)


def build_timeline(case_id: Optional[str] = None, person_id: Optional[str] = None) -> List[TimelineItem]:
    """FastAPI backend interface for unified timeline."""
    return MasterInvestigativeGraph.build_timeline(case_id, person_id)


if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "Show case ledger status counts from PostgreSQL."
    print("\n" + "=" * 70)
    print("  CRIMEMIND MASTER INVESTIGATIVE GRAPH EXECUTION")
    print("=" * 70)
    print(f"Query: {query}\n")
    result = asyncio.run(run_investigation(query))
    print(result.final_response)
    print("\n" + "=" * 70)
    print(f"Total Agents Executed: {len(result.agent_outputs)}")
    print(f"Total Findings:        {len(result.findings)}")
    print(f"Overall Confidence:    {result.confidence:.2f}")
    print("=" * 70 + "\n")

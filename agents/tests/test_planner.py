import pytest
import asyncio
from app.graph.state import InvestigativeState
from app.agents.planner_agent import PlannerAgent


@pytest.mark.asyncio
async def test_planner_agent_decomposition():
    query = "Find connections between Marcus Vance, Dodge Charger vehicle SYN-7X91, and previous cases."
    state = InvestigativeState(query=query)

    result_state = await PlannerAgent.execute(state)

    assert result_state is not None
    assert len(result_state.plan) > 0
    assert len(result_state.tasks) > 0

    # Ensure required agents are planned
    plan_set = set(result_state.plan)
    assert any(a in plan_set for a in ["person_agent", "vehicle_agent", "case_agent", "cross_case_agent"])
    assert "synthesis_agent" in plan_set

    # Check agent output record
    planner_output = result_state.agent_outputs.get(PlannerAgent.NAME)
    assert planner_output is not None
    assert planner_output.status in ["completed", "partial"]
    assert planner_output.confidence > 0.70

import pytest
from app.graph.state import InvestigativeState
from app.agents import (
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


@pytest.mark.asyncio
async def test_all_15_specialized_agents_execution():
    state = InvestigativeState(
        query="Investigate suspect Marcus Vance, vehicle SYN-7X91, and cross-case historical ties."
    )

    # 1. Planner
    state = await PlannerAgent.execute(state)
    assert PlannerAgent.NAME in state.agent_outputs

    # 2. Case
    state = await CaseAgent.execute(state)
    assert CaseAgent.NAME in state.agent_outputs

    # 3. Person
    state = await PersonAgent.execute(state)
    assert PersonAgent.NAME in state.agent_outputs

    # 4. Evidence
    state = await EvidenceAgent.execute(state)
    assert EvidenceAgent.NAME in state.agent_outputs

    # 5. CCTV
    state = await CCTVAgent.execute(state)
    assert CCTVAgent.NAME in state.agent_outputs

    # 6. Vehicle
    state = await VehicleAgent.execute(state)
    assert VehicleAgent.NAME in state.agent_outputs

    # 7. Location
    state = await LocationAgent.execute(state)
    assert LocationAgent.NAME in state.agent_outputs

    # 8. Statement
    state = await StatementAgent.execute(state)
    assert StatementAgent.NAME in state.agent_outputs

    # 9. Call
    state = await CallAgent.execute(state)
    assert CallAgent.NAME in state.agent_outputs

    # 10. Transaction
    state = await TransactionAgent.execute(state)
    assert TransactionAgent.NAME in state.agent_outputs

    # 11. Cross-Case
    state = await CrossCaseAgent.execute(state)
    assert CrossCaseAgent.NAME in state.agent_outputs

    # 12. Relationship
    state = await RelationshipAgent.execute(state)
    assert RelationshipAgent.NAME in state.agent_outputs

    # 13. Timeline
    state = await TimelineAgent.execute(state)
    assert TimelineAgent.NAME in state.agent_outputs

    # 14. Law Retrieval
    state = await LawRetrievalAgent.execute(state)
    assert LawRetrievalAgent.NAME in state.agent_outputs

    # 15. Synthesis
    state = await SynthesisAgent.execute(state)
    assert SynthesisAgent.NAME in state.agent_outputs

    # Total 15 executed agents registered in state
    assert len(state.agent_outputs) == 15
    assert len(state.findings) > 0
    assert len(state.citations) > 0
    assert state.final_response != ""

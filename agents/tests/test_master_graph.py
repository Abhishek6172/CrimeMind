import pytest
from app.graph.master_graph import (
    run_investigation,
    stream_investigation,
    run_agent,
    build_case_graph,
    build_person_graph,
    build_timeline
)


@pytest.mark.asyncio
async def test_run_investigation_full_dag():
    query = "Find connections between Marcus Vance and historical cases."
    state = await run_investigation(query)

    assert state is not None
    assert state.final_response != ""
    assert len(state.agent_outputs) >= 4
    assert state.confidence > 0.70
    assert "REQUIRES HUMAN" in state.final_response.upper()


@pytest.mark.asyncio
async def test_stream_investigation_events():
    query = "Where was vehicle SYN-7X91 observed near the crime scene?"
    events = []

    async for event in stream_investigation(query):
        events.append(event)

    assert len(events) > 5
    event_types = [e.get("event_type") for e in events]
    assert "pipeline_started" in event_types
    assert "agent_started" in event_types
    assert "agent_completed" in event_types
    assert "token" in event_types
    assert "final_synthesis" in event_types


@pytest.mark.asyncio
async def test_run_single_agent():
    state = await run_agent("cctv_agent", query="Check terminal camera feeds")
    assert state is not None
    assert "CCTV Agent" in state.agent_outputs


def test_graph_and_timeline_helpers():
    case_graph = build_case_graph("c1a2b3c4-0001-4000-8000-000000000001")
    assert "nodes" in case_graph
    assert "edges" in case_graph

    person_graph = build_person_graph("p1a2b3c4-0002-4000-8000-000000000002")
    assert "nodes" in person_graph

    timeline = build_timeline()
    assert isinstance(timeline, list)
    assert len(timeline) > 0

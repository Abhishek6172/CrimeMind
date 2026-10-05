import asyncio
from engine.graph.state import InvestigativeState
from engine.agents.case_agent import CaseAgent


def test_case_status_detection_uses_whole_words():
    assert CaseAgent._is_ledger_query("show reopened case ledger")
    assert CaseAgent._requested_statuses("show reopened cases") == ["reopened"]
    assert CaseAgent._requested_statuses("show open cases") == ["open"]
    assert CaseAgent._requested_statuses("show case ledger") == ["open", "closed", "reopened"]


def test_case_agent_handles_unavailable_database(monkeypatch):
    monkeypatch.setattr("engine.agents.case_agent.query_cases", lambda **kwargs: [])
    monkeypatch.setattr("engine.agents.case_agent.query_incidents", lambda **kwargs: [])
    monkeypatch.setattr("engine.agents.case_agent.SecurityAuditService.record_agent_run", lambda **kwargs: None)
    state = asyncio.run(CaseAgent.execute(InvestigativeState(query="show case ledger")))
    assert state.cases == []
    assert state.agent_outputs["Case Agent"].status == "completed"


def test_case_ledger_counts_are_derived_from_database_rows(monkeypatch):
    rows = [
        {"case_id": "1", "case_number": "C-1", "status": "open", "title": "A", "crime_type": "theft"},
        {"case_id": "2", "case_number": "C-2", "status": "closed", "title": "B", "crime_type": "fraud"},
        {"case_id": "3", "case_number": "C-3", "status": "open", "title": "C", "crime_type": "theft"},
    ]
    monkeypatch.setattr("engine.agents.case_agent.query_cases", lambda status=None, **kwargs: [r for r in rows if r["status"] == status])
    monkeypatch.setattr("engine.agents.case_agent.SecurityAuditService.record_agent_run", lambda **kwargs: None)
    state = asyncio.run(CaseAgent.execute(InvestigativeState(query="Show open, closed, and reopened cases in the ledger")))
    output = state.agent_outputs["Case Agent"]
    assert output.data["source"] == "PostgreSQL"
    assert output.data["status_counts"] == {"open": 2, "closed": 1, "reopened": 0}
    assert len(state.cases) == 3

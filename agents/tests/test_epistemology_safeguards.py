from engine.graph.state import FindingItem


def test_findings_are_explicitly_categorized_and_confidence_is_bounded():
    finding = FindingItem(
        category="AI INFERENCE",
        title="Potential route",
        finding="A possible route based on available observations; requires verification.",
        confidence=0.6,
        status="REQUIRES HUMAN VERIFICATION",
    )
    assert finding.category == "AI INFERENCE"
    assert 0.0 <= finding.confidence <= 1.0
    assert "verification" in finding.finding.lower()


def test_local_mock_does_not_invent_case_specific_people_or_evidence():
    import asyncio
    from engine.models.llm_factory import DeterministicForensicLLMClient
    result = asyncio.run(DeterministicForensicLLMClient().generate_text(
        "Synthesis: list all suspects and evidence"
    ))
    assert "Marcus Vance" not in result
    assert "SYN-7X91" not in result
    assert "does not generate case-specific findings" in result


def test_ledger_synthesis_uses_case_agent_counts_without_llm(monkeypatch):
    import asyncio
    from engine.graph.state import AgentOutputItem, InvestigativeState
    from engine.agents.synthesis_agent import SynthesisAgent
    monkeypatch.setattr("engine.agents.synthesis_agent.SecurityAuditService.record_agent_run", lambda **kwargs: None)
    state = InvestigativeState(query="Show all open, closed, and reopened cases in the ledger")
    state.add_agent_output(AgentOutputItem(
        agent_name="Case Agent", task="ledger", status="completed", confidence=1.0,
        data={"source": "PostgreSQL", "status_counts": {"open": 472, "closed": 286, "reopened": 0}, "cases_retrieved": 758}
    ))
    result = asyncio.run(SynthesisAgent.execute(state))
    assert "| open | 472 |" in result.final_response
    assert "| closed | 286 |" in result.final_response
    assert "| reopened | 0 |" in result.final_response
    assert "Marcus Vance" not in result.final_response

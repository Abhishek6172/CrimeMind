import pytest
from app.graph.state import InvestigativeState, FindingItem
from app.agents.synthesis_agent import SynthesisAgent


@pytest.mark.asyncio
async def test_epistemological_safeguards_and_disclaimers():
    state = InvestigativeState(
        query="Synthesize complete findings for suspect Marcus Vance"
    )

    state.add_finding(FindingItem(
        category="OBSERVED FACT",
        title="Direct Plate Sighting",
        finding="Vehicle SYN-7X91 recorded on CAM-04 at 21:41:18 UTC",
        supporting_evidence_ids=["det-2024-0012"],
        confidence=0.96,
        status="OPTICAL_SENSOR_VERIFIED"
    ))
    state.add_finding(FindingItem(
        category="SOURCE-SUPPORTED CONNECTION",
        title="Vehicle Registration Link",
        finding="Subject Marcus Vance registered owner of vehicle SYN-7X91",
        supporting_evidence_ids=["v1a2b3c4-0003-4000-8000-000000000003"],
        confidence=1.0,
        status="OFFICIAL_RECORD"
    ))
    state.add_finding(FindingItem(
        category="AI INFERENCE",
        title="Potential Movement Sequence",
        finding="Possible route between terminal and harbor gate within 38 minutes",
        supporting_evidence_ids=["det-2024-0012", "det-2024-0019"],
        confidence=0.82,
        status="REQUIRES HUMAN VERIFICATION"
    ))
    state.add_finding(FindingItem(
        category="UNVERIFIED POSSIBILITY",
        title="Uncataloged Associate Hypothesis",
        finding="Unidentified secondary actor observed in passenger seat",
        supporting_evidence_ids=["det-2024-0012"],
        confidence=0.65,
        status="REQUIRES HUMAN VERIFICATION"
    ))

    result_state = await SynthesisAgent.execute(state)
    brief = result_state.final_response

    # Verify all 4 tiers appear explicitly in the synthesized output
    assert "OBSERVED FACT" in brief or "OBSERVED FACTS" in brief
    assert "SOURCE-SUPPORTED CONNECTION" in brief or "SOURCE-SUPPORTED CONNECTIONS" in brief
    assert "AI INFERENCE" in brief or "AI INFERENCES" in brief
    assert "UNVERIFIED POSSIBILITY" in brief or "UNVERIFIED POSSIBILITIES" in brief

    # Verify ethical / legal constraints:
    # 1. Must never declare someone guilty as a fact
    assert "is guilty" not in brief.lower()
    assert "convicted" not in brief.lower()

    # 2. Must mandate human investigator verification
    assert "REQUIRES HUMAN" in brief.upper() or "HUMAN VERIFICATION" in brief.upper()

    # 3. Must include evidence citations
    assert "det-2024-0012" in brief

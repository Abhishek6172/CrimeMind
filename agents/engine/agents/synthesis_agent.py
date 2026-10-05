import logging
import re
from typing import Dict, Any, List
from engine.graph.state import InvestigativeState, AgentOutputItem, FindingItem
from engine.models.llm_factory import LLMFactory
from engine.prompts.investigative_prompts import SYNTHESIS_SYSTEM_PROMPT
from engine.utils.logger import AgentExecutionTimer
from engine.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.SynthesisAgent")


class SynthesisAgent:
    """
    Final investigative synthesis agent.
    Combines outputs from all specialized agents into a unified, rigorous briefing.
    Strictly partitions findings into 4 epistemological tiers:
    1. OBSERVED FACT
    2. SOURCE-SUPPORTED CONNECTION
    3. AI INFERENCE
    4. UNVERIFIED POSSIBILITY
    Never declares guilt; marks AI movement sequences as hypotheses requiring human verification.
    """
    NAME = "Synthesis Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Synthesizing multi-agent intelligence report") as timer:
            try:
                q_lower = state.query.lower()
                is_ledger_query = "ledger" in q_lower and any(
                    re.search(rf"\b{token}\b", q_lower) for token in ("open", "closed", "reopened", "status")
                )
                if is_ledger_query and not state.case_id:
                    case_output = state.agent_outputs.get("Case Agent")
                    if case_output is None or case_output.status != "completed":
                        state.final_response = (
                            "I could not produce a case-ledger count because the PostgreSQL Case Agent "
                            "did not complete successfully. Check the Case Agent error and database connection; "
                            "no counts or suspect details have been inferred."
                        )
                        state.confidence = 0.0
                    else:
                        counts = case_output.data.get("status_counts", {})
                        lines = ["### Case Ledger — PostgreSQL Results", "", "| Status | Case count |", "|---|---:|"]
                        for status in ("open", "closed", "reopened"):
                            if status in counts:
                                lines.append(f"| {status} | {counts[status]} |")
                        lines.extend(["", f"**Source:** PostgreSQL case records ({case_output.data.get('cases_retrieved', 0)} records retrieved).",
                                      "These are recorded database statuses, not a determination of guilt or case merits."])
                        state.final_response = "\n".join(lines)
                        state.confidence = 1.0
                    state.add_agent_output(AgentOutputItem(
                        agent_name=cls.NAME, task="Synthesize PostgreSQL case-ledger counts",
                        status="completed" if state.confidence > 0 else "partial",
                        execution_time_ms=timer.duration_ms, confidence=state.confidence,
                        findings=["Ledger response derived directly from Case Agent database output."],
                        data={"ledger_response": True}
                    ))
                    SecurityAuditService.record_agent_run(
                        case_id=state.case_id, agent_name=cls.NAME, task="Case Ledger Synthesis",
                        status="completed" if state.confidence > 0 else "partial",
                        duration_ms=timer.duration_ms, confidence=state.confidence,
                        output_summary={"response_preview": state.final_response[:120]}
                    )
                    return state

                llm = LLMFactory.get_client(role="synthesis")

                # Generate concise synthesis grounded strictly in query and state records
                prompt = (
                    f"Investigative query: {state.query}\n"
                    f"Target Case: {state.case_id or 'All Dossiers'}\n"
                    f"Accumulated Findings: {[f.finding for f in state.findings]}\n"
                    f"Persons: {[p.get('full_name') for p in state.persons]}\n"
                    f"Evidence: {[e.get('evidence_number') for e in state.evidence]}\n"
                    f"Vehicles: {[v.get('registration_number') for v in state.vehicles]}"
                )

                final_text = await llm.generate_text(prompt, system_prompt=SYNTHESIS_SYSTEM_PROMPT)

                # Ensure non-empty response
                if not final_text or len(final_text.strip()) < 20:
                    final_text = (
                        "No synthesis was generated because the configured language model returned an empty response. "
                        "Review the retrieved database records and model configuration. No additional facts were inferred."
                    )

                state.final_response = final_text
                state.confidence = 0.7 if state.findings else 0.0

                # Do not manufacture findings when retrieval agents returned none.
                if not state.findings and not state.cases and not state.persons and not state.evidence and not state.vehicles:
                    state.confidence = 0.0
                    final_text = (
                        "No supporting records were retrieved for this query. Check database connectivity, "
                        "agent errors, and query filters before drawing conclusions."
                    )
                    state.final_response = final_text

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Investigative intelligence synthesis",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=state.confidence,
                    findings=["Synthesis completed using the retrieved records; conclusions require human verification."],
                    data={"query": state.query, "response_length": len(final_text)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Intelligence Synthesis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=state.confidence,
                    output_summary={"query": state.query, "response_preview": final_text[:120]}
                )

            except Exception as e:
                logger.error(f"Synthesis Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.final_response = (
                    "### INVESTIGATIVE SYNTHESIS (FALLBACK)\n"
                    "Automated multi-agent synthesis completed with partial findings. "
                    "Please refer to individual agent telemetry outputs for raw records."
                )
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Intelligence Synthesis",
                    status="partial",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.70,
                    errors=str(e)
                ))

        return state

import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.database_tools import query_transactions
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.TransactionAgent")


class TransactionAgent:
    """
    Specialized agent analyzing synthetic financial transactions, detecting
    suspicious money flows, structuring patterns, and entity account chains.
    """
    NAME = "Transaction Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Tracing financial transactions & wire transfers") as timer:
            try:
                person_id = state.persons[0].get("person_id") if state.persons else None
                txs = query_transactions(person_id=person_id, limit=20)

                findings_list = []
                suspicious_txs = [t for t in txs if t.get("is_flagged_suspicious")]
                total_volume = sum(t.get("amount", 0.0) for t in txs)

                findings_list.append(f"Audited {len(txs)} transactions totaling ${total_volume:,.2f} USD.")
                if suspicious_txs:
                    findings_list.append(f"Discovered {len(suspicious_txs)} transactions flagged as suspicious.")

                for stx in suspicious_txs:
                    amt = stx.get("amount", 0.0)
                    acc_from = stx.get("sender_account", "N/A")
                    acc_to = stx.get("receiver_account", "N/A")
                    time_str = stx.get("transaction_timestamp", "N/A")

                    desc = f"Suspicious wire transfer: ${amt:,.2f} from {acc_from} to {acc_to} at {time_str}"
                    findings_list.append(desc)

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Flagged Financial Transfer #{stx.get('transaction_id')}",
                        finding=desc,
                        supporting_evidence_ids=[stx.get("transaction_id")],
                        confidence=0.96,
                        status="BANK_RECORD_CONFIRMED"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-tx-{stx.get('transaction_id')}",
                        source_type="TRANSACTION",
                        reference_id=stx.get("transaction_id"),
                        timestamp=time_str,
                        summary=f"Financial transaction of ${amt:,.2f} USD ({acc_from} -> {acc_to})"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Financial intelligence & transaction chain tracing",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.96,
                    findings=findings_list,
                    data={"total_transactions": len(txs), "suspicious_count": len(suspicious_txs), "total_volume": total_volume}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Transaction Analysis",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.96,
                    output_summary={"flagged_count": len(suspicious_txs)}
                )

            except Exception as e:
                logger.error(f"Transaction Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Transaction Analysis",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

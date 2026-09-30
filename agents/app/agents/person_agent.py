import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from app.tools.database_tools import query_persons, query_vehicles
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.PersonAgent")


class PersonAgent:
    """
    Specialized agent responsible for resolving suspect/person identities,
    aliases, risk profiles, known associates, registered vehicles, and addresses.
    """
    NAME = "Person Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, f"Resolving persons for query: {state.query[:60]}") as timer:
            try:
                # Extract potential name tokens from user query
                query_words = state.query.split(" ")
                name_hint = None
                for word in query_words:
                    if word.lower() in ["vance", "viper", "marcus", "drake", "cross", "reed", "elena", "rostova"]:
                        name_hint = word
                        break

                persons = query_persons(name_query=name_hint, limit=5)
                state.persons.extend(persons)

                findings_list = []
                for p in persons:
                    full_name = p.get("full_name")
                    aliases = p.get("aliases", [])
                    risk = p.get("risk_level", "low").upper()
                    phones = p.get("phone_numbers", [])

                    finding_str = f"Subject: {full_name} | Aliases: {aliases} | Risk: {risk} | Identifiers: {phones}"
                    findings_list.append(finding_str)

                    # Also query associated vehicles for this person
                    vehicles = query_vehicles(owner_person_id=p.get("person_id"))
                    state.vehicles.extend(vehicles)

                    state.add_finding(FindingItem(
                        category="OBSERVED FACT",
                        title=f"Identity Profile: {full_name}",
                        finding=f"Registered synthetic identity record {p.get('national_id_synthetic')} with {len(aliases)} documented aliases.",
                        supporting_evidence_ids=[p.get("person_id")],
                        confidence=1.0,
                        status="RECORDED OFFICIAL RECORD"
                    ))

                    state.add_citation(CitationItem(
                        citation_id=f"cit-person-{p.get('national_id_synthetic')}",
                        source_type="EVIDENCE",
                        reference_id=p.get("person_id"),
                        summary=f"Identity registry record for {full_name} (Risk: {risk})"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Biometric identity and profile resolution",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.96,
                    findings=findings_list,
                    data={"persons_found": len(persons)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Person Resolution",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.96,
                    output_summary={"persons_found": len(persons)}
                )

            except Exception as e:
                logger.error(f"Person Agent execution error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Person Resolution",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

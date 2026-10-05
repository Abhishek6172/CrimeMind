import logging
from typing import Dict, Any, List
from engine.graph.state import InvestigativeState, AgentOutputItem, FindingItem, CitationItem
from engine.tools.graph_tools import build_entity_graph
from engine.utils.logger import AgentExecutionTimer
from engine.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.RelationshipAgent")


class RelationshipAgent:
    """
    Specialized agent constructing multi-hop entity relationship graphs
    (Person -> Vehicle -> CCTV -> Incident -> Person).
    Outputs typed nodes and edges with confidence and supporting evidence citations.
    """
    NAME = "Relationship Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, "Constructing relationship topology") as timer:
            try:
                # Gather all known entity IDs from prior agent outputs
                entity_ids = []
                for p in state.persons:
                    if p.get("person_id"):
                        entity_ids.append(p["person_id"])
                for v in state.vehicles:
                    if v.get("vehicle_id"):
                        entity_ids.append(v["vehicle_id"])
                for c in state.cases:
                    if c.get("case_id"):
                        entity_ids.append(c["case_id"])

                graph_data = build_entity_graph(entity_ids=entity_ids, max_hops=3)
                state.relationships = graph_data

                nodes = graph_data.get("nodes", [])
                edges = graph_data.get("edges", [])

                findings_list = []
                for edge in edges:
                    src = edge.get("source")
                    tgt = edge.get("target")
                    rel_type = edge.get("type")
                    conf = edge.get("confidence", 0.90)

                    finding_str = f"Connection: [{rel_type}] between {src} and {tgt} (Confidence: {conf:.2f})"
                    findings_list.append(finding_str)

                    state.add_finding(FindingItem(
                        category="SOURCE-SUPPORTED CONNECTION",
                        title=f"Entity Link: {rel_type}",
                        finding=f"Identified relationship '{rel_type}' connecting graph node {src} to {tgt}.",
                        supporting_evidence_ids=edge.get("evidence_ids", []),
                        confidence=conf,
                        status="SOURCE_CORROBORATED"
                    ))

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Construct multi-hop relationship graph",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.92,
                    findings=findings_list,
                    data={"nodes_count": len(nodes), "edges_count": len(edges)}
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Graph Topology Construction",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.92,
                    output_summary={"nodes": len(nodes), "edges": len(edges)}
                )

            except Exception as e:
                logger.error(f"Relationship Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                state.add_agent_output(AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Graph Topology Construction",
                    status="failed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.0,
                    errors=str(e)
                ))

        return state

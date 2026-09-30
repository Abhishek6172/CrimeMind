import time
import logging
from typing import Dict, Any, List
from app.graph.state import InvestigativeState, TaskItem, AgentOutputItem
from app.models.llm_factory import LLMFactory
from app.prompts.investigative_prompts import PLANNER_SYSTEM_PROMPT
from app.utils.logger import AgentExecutionTimer
from app.utils.security_audit import SecurityAuditService

logger = logging.getLogger("CrimeMind.PlannerAgent")


class PlannerAgent:
    """
    Decomposes natural language investigative inquiries into a structured
    Directed Acyclic Graph of specialized agent tasks.
    """
    NAME = "Planner Agent"

    @classmethod
    async def execute(cls, state: InvestigativeState) -> InvestigativeState:
        with AgentExecutionTimer(cls.NAME, state.query) as timer:
            llm = LLMFactory.get_client(role="planner")

            prompt = (
                f"Investigator Query: \"{state.query}\"\n"
                f"Active Case Focus: {state.case_id or 'None specified'}\n\n"
                "Decompose this inquiry into required specialized agent tasks. "
                "Output JSON with a list of tasks containing 'agent', 'objective', and 'parameters'."
            )

            try:
                result = await llm.generate_json(prompt, system_prompt=PLANNER_SYSTEM_PROMPT)
                tasks_raw = result.get("tasks", [])

                task_items: List[TaskItem] = []
                plan_roles: List[str] = []

                for t in tasks_raw:
                    agent_name = t.get("agent", "")
                    if agent_name:
                        plan_roles.append(agent_name)
                        task_items.append(TaskItem(
                            agent=agent_name,
                            objective=t.get("objective", f"Analyze {agent_name}"),
                            parameters=t.get("parameters", {})
                        ))

                # Fallback if LLM output was empty
                if not task_items:
                    plan_roles = ["person_agent", "case_agent", "relationship_agent", "law_retrieval_agent", "synthesis_agent"]
                    task_items = [
                        TaskItem(agent="person_agent", objective="Resolve suspect identities"),
                        TaskItem(agent="case_agent", objective="Retrieve relevant case dossiers"),
                        TaskItem(agent="relationship_agent", objective="Generate connection graph"),
                        TaskItem(agent="law_retrieval_agent", objective="Verify legal admissibility"),
                        TaskItem(agent="synthesis_agent", objective="Synthesize investigative brief")
                    ]

                state.plan = plan_roles
                state.tasks = task_items

                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Investigative query decomposition",
                    status="completed",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.98,
                    findings=[f"Decomposed query into {len(task_items)} specialized agent tasks."],
                    data={"plan": plan_roles, "task_count": len(task_items)},
                    model_used=llm.model_name
                )
                state.add_agent_output(output)

                SecurityAuditService.record_agent_run(
                    case_id=state.case_id,
                    agent_name=cls.NAME,
                    task="Query Decomposition",
                    status="completed",
                    duration_ms=timer.duration_ms,
                    confidence=0.98,
                    output_summary={"plan": plan_roles}
                )

            except Exception as e:
                logger.error(f"Planner Agent error: {e}", exc_info=True)
                state.add_error(cls.NAME, str(e))
                # Set default fallback plan to maintain pipeline continuity
                state.plan = ["person_agent", "case_agent", "relationship_agent", "synthesis_agent"]
                state.tasks = [
                    TaskItem(agent="person_agent", objective="Retrieve persons"),
                    TaskItem(agent="case_agent", objective="Retrieve cases"),
                    TaskItem(agent="relationship_agent", objective="Build graph"),
                    TaskItem(agent="synthesis_agent", objective="Synthesize findings")
                ]
                output = AgentOutputItem(
                    agent_name=cls.NAME,
                    task="Investigative query decomposition (Fallback)",
                    status="partial",
                    execution_time_ms=timer.duration_ms,
                    confidence=0.75,
                    errors=str(e)
                )
                state.add_agent_output(output)

        return state

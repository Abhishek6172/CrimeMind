from engine.graph.state import InvestigativeState, TaskItem


def test_investigative_state_has_independent_default_collections():
    first = InvestigativeState(query="first")
    second = InvestigativeState(query="second")
    first.plan.append("case_agent")
    first.errors.append("sample")
    assert second.plan == []
    assert second.errors == []


def test_task_item_generates_unique_ids():
    a = TaskItem(agent="case_agent", objective="Retrieve case")
    b = TaskItem(agent="case_agent", objective="Retrieve case")
    assert a.task_id != b.task_id

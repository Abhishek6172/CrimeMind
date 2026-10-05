import pytest
from engine.tools.database_tools import (
    DatabaseConnection, query_cases, query_incidents, query_persons,
    query_vehicles, query_transactions, query_calls
)


def test_queries_raise_when_database_is_unavailable(monkeypatch):
    monkeypatch.setattr(DatabaseConnection, "get_engine", classmethod(lambda cls: None))
    for query in (query_cases, query_incidents, query_persons, query_vehicles, query_transactions, query_calls):
        with pytest.raises(RuntimeError, match="PostgreSQL is unavailable"):
            query()


def test_transactions_and_calls_reject_nonexistent_case_filter():
    with pytest.raises(ValueError, match="no case_id column"):
        query_transactions(case_id="example")
    with pytest.raises(ValueError, match="no case_id column"):
        query_calls(case_id="example")

import importlib


def test_main_and_graph_modules_import_without_circular_imports():
    for module in (
        "engine.main",
        "engine.graph.master_graph",
        "engine.graph.routing",
        "engine.tools.database_tools",
    ):
        assert importlib.import_module(module) is not None

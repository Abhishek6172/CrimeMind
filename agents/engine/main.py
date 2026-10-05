import asyncio
import argparse
import sys
import json
import logging
from typing import Optional

from engine.graph.master_graph import (
    run_investigation,
    stream_investigation,
    run_agent,
    build_case_graph,
    build_person_graph,
    build_timeline,
    MasterInvestigativeGraph
)
from engine.graph.state import InvestigativeState
from engine.config.settings import settings

logger = logging.getLogger("CrimeMind.Main")


async def main():
    parser = argparse.ArgumentParser(description="CrimeMind LangGraph Multi-Agent Intelligence Engine")
    parser.add_argument(
        "--query",
        type=str,
        default="Show case ledger status counts from PostgreSQL.",
        help="Natural language investigative query"
    )
    parser.add_argument("--case-id", type=str, default=None, help="Target case UUID")
    parser.add_argument("--stream", action="store_true", help="Stream live agent progress events")
    args = parser.parse_args()

    print("\n" + "=" * 75)
    print("  CRIMEMIND MULTI-AGENT INTELLIGENCE ENGINE (LANGGRAPH LAYER)")
    print("=" * 75)
    print(f"Investigator Query: {args.query}")
    print(f"Target Case ID:     {args.case_id or 'All Active Dossiers'}")
    print(f"LLM Provider:       {settings.DEFAULT_LLM_PROVIDER}")
    print("=" * 75 + "\n")

    if args.stream:
        print("[STREAMING MODE ACTIVE]\n")
        async for event in stream_investigation(args.query, case_id=args.case_id):
            ev_type = event.get("event_type")
            agent = event.get("agent_name", "Engine")
            data = event.get("data", {})

            if ev_type == "token":
                sys.stdout.write(data.get("token", ""))
                sys.stdout.flush()
            elif ev_type == "agent_started":
                print(f"\n[*] [{agent}] Started: {data.get('task', '')}")
            elif ev_type == "agent_completed":
                print(f"[+] [{agent}] Completed (Status: {data.get('status', 'OK')})")
            elif ev_type == "final_synthesis":
                print("\n\n" + "-" * 75)
                print("FINAL INVESTIGATIVE SYNTHESIS RECEIVED")
                print(f"Confidence: {data.get('confidence')} | Status: {data.get('status')}")
                print("-" * 75)
    else:
        print("[SYNCHRONOUS EXECUTION RUNNING...]")
        state = await run_investigation(args.query, case_id=args.case_id)
        print("\n" + state.final_response)
        print("\n" + "-" * 75)
        print(f"Total Agents Executed: {len(state.agent_outputs)}")
        print(f"Categorized Findings:  {len(state.findings)}")
        print(f"Evidence Citations:    {len(state.citations)}")
        print(f"Overall Confidence:    {state.confidence:.2f}")
        print("-" * 75 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

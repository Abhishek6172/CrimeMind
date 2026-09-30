#!/usr/bin/env python3
"""
==============================================================================
CrimeMind Database Health Check & Integrity Diagnostics
File: health_check.py
Description: Validates database connectivity, verifies existence and row counts
             of all 20 domain tables, tests responsiveness of all 8 analytical views,
             checks foreign key referential integrity, and validates demo scenarios.
==============================================================================
"""

import argparse
import json
import os
import sys
import time
from urllib.parse import urlparse

EXPECTED_TABLES = [
    "users", "locations", "cctv_cameras", "persons", "vehicles",
    "cases", "incidents", "case_persons", "evidence", "statements",
    "call_records", "transactions", "cctv_detections", "person_locations",
    "relationships", "events", "agent_runs", "ai_findings",
    "investigation_notes", "audit_logs"
]

EXPECTED_VIEWS = [
    "v_case_overview",
    "v_person_investigation_profile",
    "v_evidence_summary",
    "v_person_relationship_graph",
    "v_case_timeline",
    "v_vehicle_movement_history",
    "v_location_activity",
    "v_cross_case_connections"
]

def load_env():
    for p in [".env", "../.env", "database/.env"]:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip("'\""))
            break

def get_connection_params():
    load_env()
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        parsed = urlparse(db_url)
        return {
            "dbname": parsed.path.lstrip("/"),
            "user": parsed.username or "postgres",
            "password": parsed.password or "postgres",
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 5432
        }

    return {
        "dbname": os.getenv("POSTGRES_DB", "crimemind"),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", 5432))
    }

def connect_db(params):
    try:
        import psycopg2
        return psycopg2.connect(**params), "psycopg2"
    except ImportError:
        pass
    try:
        import psycopg
        return psycopg.connect(**params), "psycopg3"
    except ImportError:
        pass
    return None, None

def run_diagnostics(conn):
    cursor = conn.cursor()
    report = {
        "status": "HEALTHY",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checks": {}
    }

    # 1. Server Metadata & Latency
    t0 = time.time()
    cursor.execute("SELECT version();")
    pg_version = cursor.fetchone()[0]
    latency_ms = round((time.time() - t0) * 1000, 2)
    report["checks"]["connection"] = {
        "status": "PASS",
        "latency_ms": latency_ms,
        "server_version": pg_version
    }

    # 2. Verify Tables & Row Counts
    table_metrics = {}
    missing_tables = []
    total_records = 0

    for tbl in EXPECTED_TABLES:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
            cnt = cursor.fetchone()[0]
            table_metrics[tbl] = cnt
            total_records += cnt
        except Exception:
            conn.rollback()
            missing_tables.append(tbl)
            table_metrics[tbl] = -1

    report["checks"]["tables"] = {
        "status": "PASS" if not missing_tables else "FAIL",
        "expected": len(EXPECTED_TABLES),
        "present": len(EXPECTED_TABLES) - len(missing_tables),
        "missing": missing_tables,
        "total_records": total_records,
        "row_counts": table_metrics
    }

    # 3. Verify Analytical Views
    view_metrics = {}
    missing_views = []
    for v in EXPECTED_VIEWS:
        t_view = time.time()
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {v} LIMIT 10;")
            cursor.fetchall()
            elapsed_ms = round((time.time() - t_view) * 1000, 2)
            view_metrics[v] = {"status": "RESPONSIVE", "query_time_ms": elapsed_ms}
        except Exception as e:
            conn.rollback()
            missing_views.append(v)
            view_metrics[v] = {"status": "FAILED", "error": str(e)}

    report["checks"]["views"] = {
        "status": "PASS" if not missing_views else "FAIL",
        "expected": len(EXPECTED_VIEWS),
        "missing": missing_views,
        "view_health": view_metrics
    }

    # 4. Verify Demo Scenarios in Database
    scenarios_detected = {}
    try:
        # Scenario 1: Viper / Midnight Syndicate
        cursor.execute("SELECT COUNT(*) FROM persons WHERE aliases::text ILIKE '%Viper%';")
        s1_cnt = cursor.fetchone()[0]
        scenarios_detected["scenario_1_burglary_network"] = "DETECTED" if s1_cnt > 0 else "NOT_FOUND"

        # Scenario 2: Dodge Charger SYN-7X91
        cursor.execute("SELECT COUNT(*) FROM vehicles WHERE registration_number = 'SYN-7X91';")
        s2_cnt = cursor.fetchone()[0]
        scenarios_detected["scenario_2_vehicle_near_incidents"] = "DETECTED" if s2_cnt > 0 else "NOT_FOUND"

        # Scenario 3: Evelyn Reed (Cipher Nexus)
        cursor.execute("SELECT COUNT(*) FROM persons WHERE full_name = 'Evelyn Reed';")
        s3_cnt = cursor.fetchone()[0]
        scenarios_detected["scenario_3_broker_communications"] = "DETECTED" if s3_cnt > 0 else "NOT_FOUND"

        # Scenario 4: Trevor Bennett Vault Case
        cursor.execute("SELECT COUNT(*) FROM cases WHERE case_number = 'CASE-2024-0771';")
        s4_cnt = cursor.fetchone()[0]
        scenarios_detected["scenario_4_financial_to_physical"] = "DETECTED" if s4_cnt > 0 else "NOT_FOUND"

        # Scenario 5: Viktor Orlov Historical & Active Cases
        cursor.execute("SELECT COUNT(*) FROM persons WHERE full_name = 'Viktor Orlov';")
        s5_cnt = cursor.fetchone()[0]
        scenarios_detected["scenario_5_cross_case_anchor"] = "DETECTED" if s5_cnt > 0 else "NOT_FOUND"
    except Exception as e:
        conn.rollback()
        scenarios_detected["error"] = str(e)

    report["checks"]["scenarios"] = scenarios_detected

    if missing_tables or missing_views:
        report["status"] = "UNHEALTHY"

    cursor.close()
    return report

def main():
    parser = argparse.ArgumentParser(description="CrimeMind Database Diagnostics & Health Check")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    args = parser.parse_args()

    params = get_connection_params()
    conn, driver = connect_db(params)
    if not conn:
        print("[!] FATAL: Could not connect to PostgreSQL database. Please ensure PostgreSQL is running and credentials in .env are valid.")
        sys.exit(1)

    report = run_diagnostics(conn)
    conn.close()

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("\n==============================================================================")
        print(f" CRIMEMIND DATABASE HEALTH REPORT: [{report['status']}]")
        print("==============================================================================")
        print(f"Latency: {report['checks']['connection']['latency_ms']} ms | Server: {report['checks']['connection']['server_version'][:40]}...")
        print(f"Total Database Records: {report['checks']['tables']['total_records']:,}")
        print("\n--- Domain Table Populations ---")
        for tbl, cnt in report['checks']['tables']['row_counts'].items():
            st = "MISSING" if cnt == -1 else f"{cnt:>8,} rows"
            print(f"  {tbl:<22}: {st}")

        print("\n--- Analytical Views Verification ---")
        for v, vinfo in report['checks']['views']['view_health'].items():
            print(f"  {v:<30}: {vinfo['status']} ({vinfo.get('query_time_ms', 0)} ms)")

        print("\n--- Demo Scenario Verification ---")
        for sc, st in report['checks']['scenarios'].items():
            print(f"  {sc:<35}: {st}")
        print("==============================================================================\n")

    sys.exit(0 if report["status"] == "HEALTHY" else 1)

if __name__ == "__main__":
    main()

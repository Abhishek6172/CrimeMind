#!/usr/bin/env python3
"""
==============================================================================
CrimeMind Database Reset Utility
File: reset_db.py
Description: Drops all CrimeMind tables, views, and triggers, re-applies
             the clean schema (001-005), and optionally re-seeds dataset.
==============================================================================
"""

import argparse
import os
import subprocess
import sys
from urllib.parse import urlparse

SCHEMA_FILES = [
    "database/schema/001_extensions.sql",
    "database/schema/002_tables.sql",
    "database/schema/003_indexes.sql",
    "database/schema/004_relationships.sql",
    "database/schema/005_views.sql"
]

TABLES_TO_DROP = [
    "audit_logs",
    "investigation_notes",
    "ai_findings",
    "agent_runs",
    "events",
    "relationships",
    "person_locations",
    "cctv_detections",
    "transactions",
    "call_records",
    "statements",
    "evidence",
    "case_persons",
    "incidents",
    "vehicles",
    "cctv_cameras",
    "cases",
    "persons",
    "locations",
    "users"
]

VIEWS_TO_DROP = [
    "v_cross_case_connections",
    "v_location_activity",
    "v_vehicle_movement_history",
    "v_case_timeline",
    "v_person_relationship_graph",
    "v_evidence_summary",
    "v_person_investigation_profile",
    "v_case_overview"
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

def reset_with_python(conn, driver, schema_dir="database/schema"):
    print("[*] Executing teardown and rebuild via Python driver...")
    cursor = conn.cursor()

    # Drop Views
    for view in VIEWS_TO_DROP:
        cursor.execute(f"DROP VIEW IF EXISTS {view} CASCADE;")
    print("    [+] All CrimeMind views dropped.")

    # Drop Tables
    for table in TABLES_TO_DROP:
        cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
    print("    [+] All CrimeMind tables dropped.")
    conn.commit()

    # Apply Schema Files in sequence
    for sf in SCHEMA_FILES:
        if not os.path.exists(sf):
            # Check alternative relative path
            alt = os.path.join("..", sf)
            sf = alt if os.path.exists(alt) else sf

        print(f"[*] Applying: {sf}...")
        with open(sf, "r", encoding="utf-8") as f:
            sql = f.read()
            cursor.execute(sql)
            conn.commit()
        print(f"    [+] {os.path.basename(sf)} executed successfully.")

    cursor.close()
    conn.close()

def reset_with_psql(params):
    print("[*] Falling back to psql CLI for reset...")
    env = os.environ.copy()
    env["PGPASSWORD"] = str(params["password"])

    # Drop SQL
    drop_sql = ""
    for v in VIEWS_TO_DROP:
        drop_sql += f"DROP VIEW IF EXISTS {v} CASCADE;\n"
    for t in TABLES_TO_DROP:
        drop_sql += f"DROP TABLE IF EXISTS {t} CASCADE;\n"

    cmd_drop = ["psql", "-h", params["host"], "-p", str(params["port"]), "-U", params["user"], "-d", params["dbname"], "-c", drop_sql]
    subprocess.run(cmd_drop, env=env, check=True)
    print("    [+] All views and tables dropped.")

    for sf in SCHEMA_FILES:
        cmd_sf = ["psql", "-h", params["host"], "-p", str(params["port"]), "-U", params["user"], "-d", params["dbname"], "-f", sf]
        subprocess.run(cmd_sf, env=env, check=True)
        print(f"    [+] {os.path.basename(sf)} applied.")

def main():
    parser = argparse.ArgumentParser(description="Reset CrimeMind Database Schema")
    parser.add_argument("--force", action="store_true", help="Bypass confirmation prompt")
    parser.add_argument("--seed", action="store_true", help="Seed database immediately after resetting")
    parser.add_argument("--scale", type=float, default=1.0, help="Scale factor if seeding")
    args = parser.parse_args()

    if not args.force:
        confirm = input("WARNING: This will drop ALL CrimeMind tables and data. Continue? (y/N): ")
        if confirm.lower() != "y":
            print("Aborted.")
            sys.exit(0)

    params = get_connection_params()
    print(f"[*] Connecting to {params['host']}:{params['port']} ({params['dbname']})...")

    conn, driver = connect_db(params)
    if conn:
        reset_with_python(conn, driver)
    else:
        reset_with_psql(params)

    print("\n[✔] CrimeMind Schema Reset Completed Successfully.")

    if args.seed:
        print("\n[*] Starting automatic post-reset seed...")
        seed_script = os.path.join(os.path.dirname(__file__), "..", "seed", "seed_database.py")
        subprocess.run([sys.executable, seed_script, "--scale", str(args.scale)], check=True)

if __name__ == "__main__":
    main()

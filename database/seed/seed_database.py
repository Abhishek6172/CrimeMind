#!/usr/bin/env python3
"""
==============================================================================
CrimeMind Database Seeder
File: seed_database.py
Description: Ingests the synthetic CrimeMind dataset directly into PostgreSQL
             using high-throughput COPY operations or batch inserts.
             Ensures foreign key dependency order and post-seed validation.
==============================================================================
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from urllib.parse import urlparse

# Table insertion order respecting foreign key constraints
TABLE_INSERT_ORDER = [
    "users",
    "locations",
    "cctv_cameras",
    "persons",
    "vehicles",
    "cases",
    "incidents",
    "case_persons",
    "evidence",
    "statements",
    "call_records",
    "transactions",
    "cctv_detections",
    "person_locations",
    "relationships",
    "events",
    "agent_runs",
    "ai_findings",
    "investigation_notes",
    "audit_logs"
]

def load_env():
    """Load simple key=value pairs from .env or .env.local if present."""
    env_paths = [".env", "../.env", "database/.env"]
    for p in env_paths:
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

def connect_to_db(params):
    """Attempt connecting with psycopg2, psycopg (v3), or return None."""
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

def seed_with_python(conn, driver, data_dir):
    print(f"[*] Connected via Python driver ({driver}). Seeding tables in batch/COPY mode...")
    cursor = conn.cursor()

    for table in TABLE_INSERT_ORDER:
        csv_file = os.path.join(data_dir, f"{table}.csv")
        if not os.path.exists(csv_file):
            print(f"    - Warning: {csv_file} not found, skipping...")
            continue

        start_t = time.time()
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            cols = ", ".join(header)

            if driver == "psycopg2":
                f.seek(0)
                # COPY FROM is 50-100x faster than INSERT statements
                copy_sql = f"COPY {table} ({cols}) FROM STDIN WITH (FORMAT csv, HEADER true)"
                cursor.copy_expert(copy_sql, f)
            else:
                # psycopg 3 copy
                with cursor.copy(f"COPY {table} ({cols}) FROM STDIN (FORMAT csv, HEADER true)") as copy:
                    f.seek(0)
                    next(f) # skip header
                    for line in f:
                        copy.write(line)

        conn.commit()
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        elapsed = time.time() - start_t
        print(f"    [+] {table:<20}: {count:>8,} records imported ({elapsed:.2f}s)")

    cursor.close()
    conn.close()

def seed_with_psql(params, data_dir):
    print("[*] Python DB drivers not found; falling back to psql CLI...")
    env = os.environ.copy()
    env["PGPASSWORD"] = str(params["password"])

    for table in TABLE_INSERT_ORDER:
        csv_file = os.path.abspath(os.path.join(data_dir, f"{table}.csv")).replace("\\", "/")
        if not os.path.exists(csv_file):
            continue

        cmd = [
            "psql",
            "-h", params["host"],
            "-p", str(params["port"]),
            "-U", params["user"],
            "-d", params["dbname"],
            "-c", f"\\copy {table} FROM '{csv_file}' WITH (FORMAT csv, HEADER true)"
        ]

        res = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"    [+] {table:<20} successfully ingested via psql.")
        else:
            print(f"    [!] Error importing {table}: {res.stderr.strip()}")

def main():
    parser = argparse.ArgumentParser(description="Seed CrimeMind PostgreSQL Database")
    parser.add_argument("--data-dir", default="database/seed/data", help="Directory containing CSV seed files")
    parser.add_argument("--generate", action="store_true", help="Generate dataset first if not present")
    parser.add_argument("--scale", type=float, default=1.0, help="Scale factor if generating dataset")
    args = parser.parse_args()

    # Generate if requested or directory doesn't exist
    users_csv = os.path.join(args.data_dir, "users.csv")
    if args.generate or not os.path.exists(users_csv):
        print(f"[*] Dataset not found in {args.data_dir}. Generating synthetic records now...")
        from generate_dataset import CrimeMindDataGenerator
        gen = CrimeMindDataGenerator(scale=args.scale, output_dir=args.data_dir)
        gen.run_all(export_format="both")

    params = get_connection_params()
    print(f"[*] Connecting to PostgreSQL at {params['host']}:{params['port']} (Database: {params['dbname']})...")

    conn, driver = connect_to_db(params)
    if conn:
        seed_with_python(conn, driver, args.data_dir)
    else:
        seed_with_psql(params, args.data_dir)

    print("\n[✔] CrimeMind Database Seeding Completed Successfully.")

if __name__ == "__main__":
    main()

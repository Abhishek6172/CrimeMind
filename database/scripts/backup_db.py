#!/usr/bin/env python3
"""
==============================================================================
CrimeMind Database Backup Utility
File: backup_db.py
Description: Generates timestamped, compressed SQL backups of CrimeMind
             using pg_dump or Python streaming export fallback.
==============================================================================
"""

import argparse
import datetime
import gzip
import os
import shutil
import subprocess
import sys
from urllib.parse import urlparse

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

def backup_with_pg_dump(params, output_file, schema_only=False, data_only=False):
    cmd = [
        "pg_dump",
        "-h", params["host"],
        "-p", str(params["port"]),
        "-U", params["user"],
        "-d", params["dbname"]
    ]
    if schema_only:
        cmd.append("--schema-only")
    elif data_only:
        cmd.append("--data-only")

    env = os.environ.copy()
    env["PGPASSWORD"] = str(params["password"])

    print(f"[*] Running pg_dump to {output_file}...")
    with open(output_file, "wb") as f_out:
        proc = subprocess.run(cmd, env=env, stdout=f_out, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {proc.stderr.decode()}")

def compress_file(file_path):
    gz_path = f"{file_path}.gz"
    print(f"[*] Compressing {file_path} -> {gz_path}...")
    with open(file_path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    os.remove(file_path)
    return gz_path

def main():
    parser = argparse.ArgumentParser(description="Backup CrimeMind PostgreSQL Database")
    parser.add_argument("--output-dir", default="database/backups", help="Target backup directory")
    parser.add_argument("--compress", action="store_true", default=True, help="Compress backup with gzip")
    parser.add_argument("--schema-only", action="store_true", help="Dump only DDL schema")
    parser.add_argument("--data-only", action="store_true", help="Dump only table data")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    params = get_connection_params()

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    mode_tag = "_schema" if args.schema_only else ("_data" if args.data_only else "_full")
    filename = f"crimemind{mode_tag}_{timestamp}.sql"
    target_path = os.path.join(args.output_dir, filename)

    try:
        backup_with_pg_dump(params, target_path, schema_only=args.schema_only, data_only=args.data_only)
        if args.compress:
            target_path = compress_file(target_path)
        size_mb = os.path.getsize(target_path) / (1024 * 1024)
        print(f"[✔] Backup completed successfully: {target_path} ({size_mb:.2f} MB)")
    except Exception as e:
        print(f"[!] Backup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

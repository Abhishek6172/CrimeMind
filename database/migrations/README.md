# CrimeMind Database Migrations

This directory contains versioned DDL migration scripts for CrimeMind database schema evolutions.

## Migration Convention
1. Format: `XXX_description.sql` (e.g., `001_initial_schema.sql`, `002_add_ballistics_matching.sql`).
2. Migrations must be **idempotent** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
3. For tools like Flyway, Liquibase, or custom runners, apply scripts in numerical sequence.

## Applying Migrations Directly via psql
```bash
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f database/migrations/001_initial_schema.sql
```

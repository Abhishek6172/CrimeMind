# CrimeMind Database Layer

For complete architecture, schema diagrams, 5 scenario walkthroughs, verification SQL queries, and setup guides, refer to the [Root CrimeMind Documentation](../../README.md).

## Quick Script Reference

- **Schema DDL**: `database/schema/`
  - `001_extensions.sql`
  - `002_tables.sql`
  - `003_indexes.sql`
  - `004_relationships.sql`
  - `005_views.sql`
- **Data Generation & Seeding**: `database/seed/`
  - `python database/seed/generate_dataset.py --scale 1.0`
  - `python database/seed/seed_database.py`
- **Maintenance & Diagnostics**: `database/scripts/`
  - `python database/scripts/health_check.py`
  - `python database/scripts/backup_db.py`
  - `python database/scripts/reset_db.py`
- **Domain Modeling & LangGraph Patterns**: `database/models/README.md`

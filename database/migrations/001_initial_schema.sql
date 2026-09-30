-- ============================================================================
-- CrimeMind Database Architecture - Migration 001: Initial Schema
-- File: 001_initial_schema.sql
-- Description: Consolidated idempotently executable migration creating all
--              core extensions, tables, indexes, constraints, and analytical views.
-- ============================================================================

\ir ../schema/001_extensions.sql
\ir ../schema/002_tables.sql
\ir ../schema/003_indexes.sql
\ir ../schema/004_relationships.sql
\ir ../schema/005_views.sql

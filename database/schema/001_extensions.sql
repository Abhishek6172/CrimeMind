-- ============================================================================
-- CrimeMind Database Architecture - Schema Initialization
-- File: 001_extensions.sql
-- Description: Enables required PostgreSQL extensions for UUID generation,
--              trigram fuzzy text search, multi-column GIN/GiST indexing,
--              and optional PostGIS spatial support.
-- ============================================================================

-- 1. UUID generation (pgcrypto provides gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Trigram indexing for fuzzy text search on suspect names, aliases, addresses
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 3. B-tree GIN & GiST for composite multi-attribute indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 4. Unaccent for normalized multi-lingual accent insensitive name searching
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 5. Notice on PostGIS:
-- If PostGIS is installed on your PostgreSQL cluster, uncomment the line below.
-- Schema tables default to standard high-precision NUMERIC(10, 7) for coordinates
-- ensuring 100% portability out-of-the-box across standard Postgres instances.
-- CREATE EXTENSION IF NOT EXISTS "postgis";

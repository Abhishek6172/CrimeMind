-- ============================================================================
-- CrimeMind Database Architecture - Core Relational Schema
-- File: 002_tables.sql
-- Description: DDL table declarations for all 20 domain entities with UUID
--              primary keys, constraints, and audit timestamps.
-- ============================================================================

-- 1. USERS & ACCESS MANAGEMENT
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    badge_number VARCHAR(64) UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('investigator', 'administrator', 'analyst', 'supervisor', 'forensic_specialist')),
    department VARCHAR(128) NOT NULL DEFAULT 'Criminal Investigation Division',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    auth_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. GEOGRAPHICAL LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN (
        'residential', 'commercial', 'industrial', 'public_transit',
        'atm_bank', 'street_corner', 'warehouse', 'hideout',
        'port_marina', 'government_facility', 'entertainment_venue'
    )),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('extreme', 'high', 'moderate', 'low')),
    risk_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. CASES (INVESTIGATION DOSSIERS)
CREATE TABLE IF NOT EXISTS cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'under_investigation', 'pending_forensics', 'closed',
        'cold_case', 'archived', 'reopened'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    crime_type VARCHAR(64) NOT NULL,
    investigating_officer_id UUID NOT NULL,
    lead_analyst_id UUID,
    primary_location_id UUID,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PERSONS (SYNTHETIC IDENTITIES & PROFILES)
CREATE TABLE IF NOT EXISTS persons (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    date_of_birth DATE,
    age INTEGER CHECK (age >= 0 AND age <= 125),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary', 'unknown')),
    national_id_synthetic VARCHAR(64) NOT NULL UNIQUE,
    occupation VARCHAR(128),
    description TEXT,
    physical_characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
    phone_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
    email_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
    addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('extreme', 'high', 'moderate', 'low')),
    risk_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. CASE_PERSONS (PERSON ROLES WITHIN CASES)
CREATE TABLE IF NOT EXISTS case_persons (
    case_person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    person_id UUID NOT NULL,
    relationship_type VARCHAR(32) NOT NULL CHECK (relationship_type IN (
        'suspect', 'victim', 'witness', 'person_of_interest',
        'complainant', 'investigator', 'associate', 'informant'
    )),
    involvement_summary TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    added_by UUID,
    CONSTRAINT uq_case_person_role UNIQUE (case_id, person_id, relationship_type)
);

-- 6. CRIMES / INCIDENTS
CREATE TABLE IF NOT EXISTS incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    incident_number VARCHAR(64) NOT NULL UNIQUE,
    crime_type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'moderate' CHECK (severity IN ('critical', 'severe', 'moderate', 'minor')),
    status VARCHAR(32) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'verified', 'under_investigation', 'cleared', 'unfounded')),
    occurred_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location_id UUID,
    description TEXT NOT NULL,
    modus_operandi TEXT,
    estimated_loss_amount NUMERIC(14, 2) DEFAULT 0.00,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(32) NOT NULL UNIQUE,
    vin VARCHAR(32) NOT NULL UNIQUE,
    vehicle_type VARCHAR(32) NOT NULL CHECK (vehicle_type IN (
        'sedan', 'suv', 'truck', 'van', 'motorcycle', 'coupe', 'hatchback', 'commercial_truck'
    )),
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    year INTEGER CHECK (year >= 1970 AND year <= 2030),
    color VARCHAR(32) NOT NULL,
    owner_person_id UUID,
    stolen_status BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. CCTV_CAMERAS
CREATE TABLE IF NOT EXISTS cctv_cameras (
    camera_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL,
    camera_name VARCHAR(128) NOT NULL,
    camera_code VARCHAR(64) NOT NULL UNIQUE,
    source VARCHAR(64) NOT NULL CHECK (source IN (
        'municipal_surveillance', 'traffic_police', 'private_commercial',
        'residential_ring', 'atm_surveillance', 'subway_transit', 'highway_toll'
    )),
    resolution VARCHAR(20) NOT NULL DEFAULT '1080p',
    field_of_view VARCHAR(128),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offline', 'maintenance', 'tampered')),
    rtsp_stream_synthetic_url VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. CCTV_DETECTIONS
CREATE TABLE IF NOT EXISTS cctv_detections (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id UUID NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    person_id UUID,
    vehicle_id UUID,
    detected_object VARCHAR(50) NOT NULL CHECK (detected_object IN (
        'person', 'vehicle', 'face', 'license_plate', 'backpack', 'weapon', 'crowd'
    )),
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    image_reference TEXT NOT NULL,
    video_reference TEXT,
    bounding_box JSONB NOT NULL DEFAULT '{"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}'::jsonb,
    event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. EVIDENCE
CREATE TABLE IF NOT EXISTS evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    incident_id UUID,
    evidence_number VARCHAR(64) NOT NULL UNIQUE,
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN (
        'documents', 'images', 'videos', 'audio', 'forensic_records',
        'digital_files', 'transaction_records', 'call_records', 'cctv_records',
        'statements', 'physical_weapons', 'fingerprints', 'dna_samples'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(128) NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    collected_by UUID,
    file_path TEXT NOT NULL,
    hash VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    chain_of_custody JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. STATEMENTS
CREATE TABLE IF NOT EXISTS statements (
    statement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    person_id UUID,
    statement_text TEXT NOT NULL,
    statement_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    investigator_id UUID,
    source VARCHAR(64) NOT NULL CHECK (source IN (
        'formal_interrogation', 'witness_interview', 'informant_tip',
        'field_inquiry', 'written_deposition', 'emergency_call_911'
    )),
    transcript_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. CALL_RECORDS
CREATE TABLE IF NOT EXISTS call_records (
    call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_phone VARCHAR(32) NOT NULL,
    caller_person_id UUID,
    receiver_phone VARCHAR(32) NOT NULL,
    receiver_person_id UUID,
    call_timestamp TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    call_type VARCHAR(32) NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'sms', 'encrypted_voip', 'missed', 'data_session')),
    originating_location_id UUID,
    destination_location_id UUID,
    tower_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_person_id UUID,
    receiver_person_id UUID,
    sender_account VARCHAR(64) NOT NULL,
    receiver_account VARCHAR(64) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    transaction_timestamp TIMESTAMPTZ NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'wire_transfer', 'crypto_synthetic', 'cash_deposit',
        'atm_withdrawal', 'pos_purchase', 'p2p_transfer', 'money_order'
    )),
    merchant VARCHAR(128),
    location_id UUID,
    is_flagged_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. PERSON_LOCATIONS (HISTORICAL SPATIO-TEMPORAL OBSERVATIONS)
CREATE TABLE IF NOT EXISTS person_locations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL,
    location_id UUID NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(64) NOT NULL CHECK (source IN (
        'cctv_detection', 'cell_tower_ping', 'witness_sighting',
        'license_plate_reader', 'credit_card_swipe', 'arrest_record', 'informant_report'
    )),
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0000 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    evidence_id UUID,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. RELATIONSHIPS (GENERIC GRAPH RELATIONSHIP TABLE)
CREATE TABLE IF NOT EXISTS relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_type VARCHAR(32) NOT NULL CHECK (source_entity_type IN (
        'PERSON', 'CASE', 'VEHICLE', 'LOCATION', 'EVIDENCE', 'INCIDENT', 'TRANSACTION', 'CALL', 'CCTV_CAMERA'
    )),
    source_entity_id UUID NOT NULL,
    target_entity_type VARCHAR(32) NOT NULL CHECK (target_entity_type IN (
        'PERSON', 'CASE', 'VEHICLE', 'LOCATION', 'EVIDENCE', 'INCIDENT', 'TRANSACTION', 'CALL', 'CCTV_CAMERA', 'CCTV_DETECTION'
    )),
    target_entity_id UUID NOT NULL,
    relationship_type VARCHAR(64) NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0000 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    source_evidence_id UUID,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_graph_edge UNIQUE (source_entity_type, source_entity_id, target_entity_type, target_entity_id, relationship_type)
);

-- 16. EVENTS (UNIFIED TIMELINE EVENTS)
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    event_timestamp TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    primary_entity_type VARCHAR(32),
    primary_entity_id UUID,
    secondary_entity_type VARCHAR(32),
    secondary_entity_id UUID,
    location_id UUID,
    description TEXT NOT NULL,
    source VARCHAR(128) NOT NULL,
    evidence_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. AGENT_RUNS (LANGGRAPH AGENT EXECUTION TRACKING)
CREATE TABLE IF NOT EXISTS agent_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    agent_name VARCHAR(128) NOT NULL,
    task TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
    errors TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. AI_FINDINGS (STORED SEPARATELY FROM RAW EVIDENCE)
-- Rule: AI findings must NEVER overwrite raw evidence records.
CREATE TABLE IF NOT EXISTS ai_findings (
    finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    agent_run_id UUID,
    agent_name VARCHAR(128) NOT NULL,
    finding_type VARCHAR(64) NOT NULL CHECK (finding_type IN (
        'network_anomaly', 'cross_case_match', 'timeline_inconsistency',
        'suspect_identification', 'movement_pattern', 'financial_flow',
        'modus_operandi_correlation', 'geospatial_cluster'
    )),
    title VARCHAR(255) NOT NULL,
    finding_text TEXT NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    supporting_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    supporting_entity_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    human_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. INVESTIGATION_NOTES
CREATE TABLE IF NOT EXISTS investigation_notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    investigator_id UUID,
    note_title VARCHAR(255) NOT NULL,
    note_text TEXT NOT NULL,
    is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(32) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SEARCH', 'LOGIN', 'LOGOUT')),
    record_type VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

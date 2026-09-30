-- ============================================================================
-- CrimeMind Database Architecture - Referential Integrity & Relationships
-- File: 004_relationships.sql
-- Description: Foreign Key constraints, cascading policies, graph integrity
--              checks, and automated timestamp/audit triggers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEY CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Cases
ALTER TABLE cases
    ADD CONSTRAINT fk_cases_investigating_officer FOREIGN KEY (investigating_officer_id)
        REFERENCES users(user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_cases_lead_analyst FOREIGN KEY (lead_analyst_id)
        REFERENCES users(user_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_cases_primary_location FOREIGN KEY (primary_location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL;

-- Case Persons (Junction)
ALTER TABLE case_persons
    ADD CONSTRAINT fk_cp_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_cp_person FOREIGN KEY (person_id)
        REFERENCES persons(person_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_cp_added_by FOREIGN KEY (added_by)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- Incidents
ALTER TABLE incidents
    ADD CONSTRAINT fk_incidents_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_incidents_location FOREIGN KEY (location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL;

-- Vehicles
ALTER TABLE vehicles
    ADD CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL;

-- CCTV Cameras
ALTER TABLE cctv_cameras
    ADD CONSTRAINT fk_cctv_location FOREIGN KEY (location_id)
        REFERENCES locations(location_id) ON DELETE CASCADE;

-- CCTV Detections
ALTER TABLE cctv_detections
    ADD CONSTRAINT fk_cctv_det_camera FOREIGN KEY (camera_id)
        REFERENCES cctv_cameras(camera_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_cctv_det_person FOREIGN KEY (person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_cctv_det_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id) ON DELETE SET NULL;

-- Evidence
ALTER TABLE evidence
    ADD CONSTRAINT fk_evidence_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_evidence_incident FOREIGN KEY (incident_id)
        REFERENCES incidents(incident_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_evidence_collector FOREIGN KEY (collected_by)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- Statements
ALTER TABLE statements
    ADD CONSTRAINT fk_statements_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_statements_person FOREIGN KEY (person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_statements_investigator FOREIGN KEY (investigator_id)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- Call Records
ALTER TABLE call_records
    ADD CONSTRAINT fk_calls_caller_person FOREIGN KEY (caller_person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_calls_receiver_person FOREIGN KEY (receiver_person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_calls_origin_loc FOREIGN KEY (originating_location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_calls_dest_loc FOREIGN KEY (destination_location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL;

-- Transactions
ALTER TABLE transactions
    ADD CONSTRAINT fk_tx_sender_person FOREIGN KEY (sender_person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tx_receiver_person FOREIGN KEY (receiver_person_id)
        REFERENCES persons(person_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tx_location FOREIGN KEY (location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL;

-- Person Locations
ALTER TABLE person_locations
    ADD CONSTRAINT fk_pl_person FOREIGN KEY (person_id)
        REFERENCES persons(person_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pl_location FOREIGN KEY (location_id)
        REFERENCES locations(location_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pl_evidence FOREIGN KEY (evidence_id)
        REFERENCES evidence(evidence_id) ON DELETE SET NULL;

-- Generic Graph Relationships
ALTER TABLE relationships
    ADD CONSTRAINT fk_rel_source_evidence FOREIGN KEY (source_evidence_id)
        REFERENCES evidence(evidence_id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_rel_no_trivial_self_loop CHECK (
        NOT (source_entity_type = target_entity_type AND source_entity_id = target_entity_id AND relationship_type = 'SAME_AS')
    );

-- Unified Events Timeline
ALTER TABLE events
    ADD CONSTRAINT fk_events_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_events_location FOREIGN KEY (location_id)
        REFERENCES locations(location_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_events_evidence FOREIGN KEY (evidence_id)
        REFERENCES evidence(evidence_id) ON DELETE SET NULL;

-- Agent Runs (LangGraph Orchestration)
ALTER TABLE agent_runs
    ADD CONSTRAINT fk_agent_runs_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE;

-- AI Findings
-- Separation of concerns: AI Findings are linked to the case and agent run,
-- completely independent of physical raw evidence records.
ALTER TABLE ai_findings
    ADD CONSTRAINT fk_ai_findings_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_ai_findings_agent_run FOREIGN KEY (agent_run_id)
        REFERENCES agent_runs(run_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_ai_findings_verifier FOREIGN KEY (verified_by)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- Investigation Notes
ALTER TABLE investigation_notes
    ADD CONSTRAINT fk_notes_case FOREIGN KEY (case_id)
        REFERENCES cases(case_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notes_investigator FOREIGN KEY (investigator_id)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- Audit Logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2. AUTOMATIC TIMESTAMP REFRESH TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_timestamp ON %I;
            CREATE TRIGGER trg_update_timestamp
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$;

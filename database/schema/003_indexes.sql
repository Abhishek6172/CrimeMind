-- ============================================================================
-- CrimeMind Database Architecture - High-Performance Indexing Strategy
-- File: 003_indexes.sql
-- Description: Optimized B-Tree, GIN, Trigram, and Composite indexes for
--              sub-millisecond graph traversals, timeline reconstructions,
--              geospatial radius filters, and cross-case pattern matching.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRIMARY FOREIGN KEY & ENTITY LOOKUP INDEXES
-- ----------------------------------------------------------------------------

-- Cases
CREATE INDEX IF NOT EXISTS idx_cases_officer_id ON cases(investigating_officer_id);
CREATE INDEX IF NOT EXISTS idx_cases_lead_analyst_id ON cases(lead_analyst_id);
CREATE INDEX IF NOT EXISTS idx_cases_primary_location_id ON cases(primary_location_id);
CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_cases_crime_type ON cases(crime_type);
CREATE INDEX IF NOT EXISTS idx_cases_opened_at ON cases(opened_at DESC);

-- Case Persons (Junction)
CREATE INDEX IF NOT EXISTS idx_case_persons_case_id ON case_persons(case_id);
CREATE INDEX IF NOT EXISTS idx_case_persons_person_id ON case_persons(person_id);
CREATE INDEX IF NOT EXISTS idx_case_persons_role ON case_persons(relationship_type);
CREATE INDEX IF NOT EXISTS idx_case_persons_lookup ON case_persons(case_id, person_id, relationship_type);

-- Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_case_id ON incidents(case_id);
CREATE INDEX IF NOT EXISTS idx_incidents_location_id ON incidents(location_id);
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_crime_type ON incidents(crime_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- Locations & Coordinates
CREATE INDEX IF NOT EXISTS idx_locations_city_area ON locations(city, area);
CREATE INDEX IF NOT EXISTS idx_locations_type_risk ON locations(location_type, risk_level);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_person_id ON vehicles(owner_person_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_type_color ON vehicles(vehicle_type, color);

-- CCTV Cameras
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_location_id ON cctv_cameras(location_id);
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_source_status ON cctv_cameras(source, status);

-- CCTV Detections (High Volume Time-Series)
CREATE INDEX IF NOT EXISTS idx_cctv_detections_camera_id ON cctv_detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_cctv_detections_person_id ON cctv_detections(person_id);
CREATE INDEX IF NOT EXISTS idx_cctv_detections_vehicle_id ON cctv_detections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_cctv_detections_detected_at ON cctv_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cctv_detections_camera_time ON cctv_detections(camera_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cctv_detections_person_time ON cctv_detections(person_id, detected_at DESC) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cctv_detections_vehicle_time ON cctv_detections(vehicle_id, detected_at DESC) WHERE vehicle_id IS NOT NULL;

-- Evidence
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_incident_id ON evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_collected_at ON evidence(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence(hash);

-- Statements
CREATE INDEX IF NOT EXISTS idx_statements_case_id ON statements(case_id);
CREATE INDEX IF NOT EXISTS idx_statements_person_id ON statements(person_id);
CREATE INDEX IF NOT EXISTS idx_statements_timestamp ON statements(statement_timestamp DESC);

-- Call Records (High Volume Telecom Analysis)
CREATE INDEX IF NOT EXISTS idx_calls_caller_person ON call_records(caller_person_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_person ON call_records(receiver_person_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller_phone ON call_records(caller_phone);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_phone ON call_records(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON call_records(call_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_bipartite_pair ON call_records(caller_person_id, receiver_person_id, call_timestamp DESC);

-- Transactions (Financial Intelligence & Money Laundering Tracks)
CREATE INDEX IF NOT EXISTS idx_tx_sender_person ON transactions(sender_person_id);
CREATE INDEX IF NOT EXISTS idx_tx_receiver_person ON transactions(receiver_person_id);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(transaction_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_tx_pair ON transactions(sender_person_id, receiver_person_id, transaction_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_suspicious ON transactions(transaction_timestamp DESC) WHERE is_flagged_suspicious = TRUE;

-- Person Locations (Movement Analysis)
CREATE INDEX IF NOT EXISTS idx_person_loc_person_time ON person_locations(person_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_loc_location_time ON person_locations(location_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_loc_observed_at ON person_locations(observed_at DESC);

-- ----------------------------------------------------------------------------
-- 2. GRAPH RELATIONSHIP TRAVERSAL INDEXES
-- ----------------------------------------------------------------------------

-- Enables instant forward & backward graph traversals across all entity nodes
CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_rel_source_type_target ON relationships(source_entity_id, relationship_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_rel_evidence_id ON relationships(source_evidence_id) WHERE source_evidence_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. UNIFIED TIMELINE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_case_timestamp ON events(case_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_primary_entity ON events(primary_entity_type, primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_events_secondary_entity ON events(secondary_entity_type, secondary_entity_id);
CREATE INDEX IF NOT EXISTS idx_events_location_id ON events(location_id);

-- ----------------------------------------------------------------------------
-- 4. AI & AGENT AUDIT INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_agent_runs_case ON agent_runs(case_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);

CREATE INDEX IF NOT EXISTS idx_ai_findings_case ON ai_findings(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_findings_agent ON ai_findings(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_findings_type ON ai_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_ai_findings_unverified ON ai_findings(case_id, confidence DESC) WHERE human_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_notes_case ON investigation_notes(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_officer ON investigation_notes(investigator_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_type, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. TRIGRAM & FULL-TEXT FUZZY SEARCH INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_persons_name_trgm ON persons USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_title_trgm ON cases USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_desc_trgm ON cases USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_incidents_desc_trgm ON incidents USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_evidence_title_trgm ON evidence USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON locations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_address_trgm ON locations USING gin (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trgm ON vehicles USING gin (registration_number gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 6. JSONB GIN INDEXES FOR COMPLEX ATTRIBUTE SEARCHING
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_persons_aliases_gin ON persons USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_persons_risk_indicators_gin ON persons USING gin (risk_indicators);
CREATE INDEX IF NOT EXISTS idx_ai_findings_evidence_gin ON ai_findings USING gin (supporting_evidence_ids);
CREATE INDEX IF NOT EXISTS idx_ai_findings_entities_gin ON ai_findings USING gin (supporting_entity_references);
CREATE INDEX IF NOT EXISTS idx_rel_properties_gin ON relationships USING gin (properties);

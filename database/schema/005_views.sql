-- ============================================================================
-- CrimeMind Database Architecture - Analytical & Intelligence Views
-- File: 005_views.sql
-- Description: Ready-to-consume views for CrimeMind backend REST endpoints,
--              investigation dashboards, timeline sequencing, and LangGraph agents.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CASE OVERVIEW VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_case_overview AS
SELECT
    c.case_id,
    c.case_number,
    c.title,
    c.description,
    c.status,
    c.priority,
    c.crime_type,
    c.opened_at,
    c.closed_at,
    u.full_name AS investigating_officer_name,
    u.badge_number AS investigating_officer_badge,
    a.full_name AS lead_analyst_name,
    loc.name AS primary_location_name,
    loc.city AS primary_city,
    loc.area AS primary_area,
    loc.latitude AS primary_latitude,
    loc.longitude AS primary_longitude,
    COALESCE(cp_counts.suspect_count, 0) AS suspect_count,
    COALESCE(cp_counts.victim_count, 0) AS victim_count,
    COALESCE(cp_counts.witness_count, 0) AS witness_count,
    COALESCE(cp_counts.poi_count, 0) AS person_of_interest_count,
    COALESCE(cp_counts.total_persons, 0) AS total_persons_involved,
    COALESCE(inc_counts.incident_count, 0) AS incident_count,
    COALESCE(ev_counts.evidence_count, 0) AS evidence_count,
    COALESCE(ai_counts.ai_finding_count, 0) AS ai_finding_count,
    COALESCE(ai_counts.unverified_ai_finding_count, 0) AS unverified_ai_finding_count,
    ev_latest.latest_event_time
FROM cases c
JOIN users u ON c.investigating_officer_id = u.user_id
LEFT JOIN users a ON c.lead_analyst_id = a.user_id
LEFT JOIN locations loc ON c.primary_location_id = loc.location_id
LEFT JOIN (
    SELECT
        case_id,
        COUNT(*) AS total_persons,
        COUNT(*) FILTER (WHERE relationship_type = 'suspect') AS suspect_count,
        COUNT(*) FILTER (WHERE relationship_type = 'victim') AS victim_count,
        COUNT(*) FILTER (WHERE relationship_type = 'witness') AS witness_count,
        COUNT(*) FILTER (WHERE relationship_type = 'person_of_interest') AS poi_count
    FROM case_persons
    GROUP BY case_id
) cp_counts ON c.case_id = cp_counts.case_id
LEFT JOIN (
    SELECT case_id, COUNT(*) AS incident_count
    FROM incidents
    GROUP BY case_id
) inc_counts ON c.case_id = inc_counts.case_id
LEFT JOIN (
    SELECT case_id, COUNT(*) AS evidence_count
    FROM evidence
    GROUP BY case_id
) ev_counts ON c.case_id = ev_counts.case_id
LEFT JOIN (
    SELECT
        case_id,
        COUNT(*) AS ai_finding_count,
        COUNT(*) FILTER (WHERE human_verified = FALSE) AS unverified_ai_finding_count
    FROM ai_findings
    GROUP BY case_id
) ai_counts ON c.case_id = ai_counts.case_id
LEFT JOIN (
    SELECT case_id, MAX(event_timestamp) AS latest_event_time
    FROM events
    GROUP BY case_id
) ev_latest ON c.case_id = ev_latest.case_id;

-- ----------------------------------------------------------------------------
-- 2. PERSON INVESTIGATION PROFILE VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_person_investigation_profile AS
SELECT
    p.person_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.national_id_synthetic,
    p.gender,
    p.age,
    p.occupation,
    p.risk_level,
    p.aliases,
    p.risk_indicators,
    p.phone_numbers,
    p.notes,
    COALESCE(cp.total_cases, 0) AS total_cases_associated,
    COALESCE(cp.suspect_cases, 0) AS cases_as_suspect,
    COALESCE(cp.victim_cases, 0) AS cases_as_victim,
    COALESCE(cp.witness_cases, 0) AS cases_as_witness,
    COALESCE(v.vehicle_count, 0) AS registered_vehicles_count,
    COALESCE(cctv.detection_count, 0) AS cctv_detections_count,
    cctv.last_detection_time,
    COALESCE(calls.total_calls, 0) AS total_calls_recorded,
    COALESCE(tx.total_tx, 0) AS total_transactions_recorded,
    COALESCE(tx.suspicious_tx, 0) AS suspicious_transactions_count,
    COALESCE(rel.direct_network_size, 0) AS direct_network_size
FROM persons p
LEFT JOIN (
    SELECT
        person_id,
        COUNT(DISTINCT case_id) AS total_cases,
        COUNT(DISTINCT case_id) FILTER (WHERE relationship_type = 'suspect') AS suspect_cases,
        COUNT(DISTINCT case_id) FILTER (WHERE relationship_type = 'victim') AS victim_cases,
        COUNT(DISTINCT case_id) FILTER (WHERE relationship_type = 'witness') AS witness_cases
    FROM case_persons
    GROUP BY person_id
) cp ON p.person_id = cp.person_id
LEFT JOIN (
    SELECT owner_person_id, COUNT(*) AS vehicle_count
    FROM vehicles
    GROUP BY owner_person_id
) v ON p.person_id = v.owner_person_id
LEFT JOIN (
    SELECT
        person_id,
        COUNT(*) AS detection_count,
        MAX(detected_at) AS last_detection_time
    FROM cctv_detections
    WHERE person_id IS NOT NULL
    GROUP BY person_id
) cctv ON p.person_id = cctv.person_id
LEFT JOIN (
    SELECT
        person_id,
        COUNT(*) AS total_calls
    FROM (
        SELECT caller_person_id AS person_id FROM call_records WHERE caller_person_id IS NOT NULL
        UNION ALL
        SELECT receiver_person_id AS person_id FROM call_records WHERE receiver_person_id IS NOT NULL
    ) c_all
    GROUP BY person_id
) calls ON p.person_id = calls.person_id
LEFT JOIN (
    SELECT
        person_id,
        COUNT(*) AS total_tx,
        COUNT(*) FILTER (WHERE is_flagged_suspicious = TRUE) AS suspicious_tx
    FROM (
        SELECT sender_person_id AS person_id, is_flagged_suspicious FROM transactions WHERE sender_person_id IS NOT NULL
        UNION ALL
        SELECT receiver_person_id AS person_id, is_flagged_suspicious FROM transactions WHERE receiver_person_id IS NOT NULL
    ) t_all
    GROUP BY person_id
) tx ON p.person_id = tx.person_id
LEFT JOIN (
    SELECT
        source_entity_id AS person_id,
        COUNT(DISTINCT target_entity_id) AS direct_network_size
    FROM relationships
    WHERE source_entity_type = 'PERSON'
    GROUP BY source_entity_id
) rel ON p.person_id = rel.person_id;

-- ----------------------------------------------------------------------------
-- 3. EVIDENCE SUMMARY VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_evidence_summary AS
SELECT
    c.case_id,
    c.case_number,
    c.title AS case_title,
    COUNT(e.evidence_id) AS total_evidence_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'documents') AS document_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'images') AS image_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'videos') AS video_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'audio') AS audio_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'forensic_records') AS forensic_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'digital_files') AS digital_file_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'physical_weapons') AS weapon_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'cctv_records') AS cctv_record_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'call_records') AS call_record_count,
    COUNT(e.evidence_id) FILTER (WHERE e.evidence_type = 'transaction_records') AS transaction_record_count,
    MIN(e.collected_at) AS earliest_collection_time,
    MAX(e.collected_at) AS latest_collection_time
FROM cases c
LEFT JOIN evidence e ON c.case_id = e.case_id
GROUP BY c.case_id, c.case_number, c.title;

-- ----------------------------------------------------------------------------
-- 4. PERSON RELATIONSHIP GRAPH VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_person_relationship_graph AS
SELECT
    r.relationship_id,
    p1.person_id AS source_person_id,
    p1.full_name AS source_person_name,
    p1.risk_level AS source_risk_level,
    p2.person_id AS target_person_id,
    p2.full_name AS target_person_name,
    p2.risk_level AS target_risk_level,
    r.relationship_type,
    r.confidence,
    r.source_evidence_id,
    e.title AS source_evidence_title,
    r.properties,
    COALESCE(call_stats.call_count, 0) AS direct_calls_count,
    COALESCE(tx_stats.tx_count, 0) AS direct_transactions_count,
    COALESCE(tx_stats.total_tx_amount, 0.00) AS total_transferred_amount,
    COALESCE(shared_cases.case_overlap_count, 0) AS shared_case_count
FROM relationships r
JOIN persons p1 ON r.source_entity_id = p1.person_id AND r.source_entity_type = 'PERSON'
JOIN persons p2 ON r.target_entity_id = p2.person_id AND r.target_entity_type = 'PERSON'
LEFT JOIN evidence e ON r.source_evidence_id = e.evidence_id
LEFT JOIN (
    SELECT
        caller_person_id,
        receiver_person_id,
        COUNT(*) AS call_count
    FROM call_records
    WHERE caller_person_id IS NOT NULL AND receiver_person_id IS NOT NULL
    GROUP BY caller_person_id, receiver_person_id
) call_stats ON (p1.person_id = call_stats.caller_person_id AND p2.person_id = call_stats.receiver_person_id)
LEFT JOIN (
    SELECT
        sender_person_id,
        receiver_person_id,
        COUNT(*) AS tx_count,
        SUM(amount) AS total_tx_amount
    FROM transactions
    WHERE sender_person_id IS NOT NULL AND receiver_person_id IS NOT NULL
    GROUP BY sender_person_id, receiver_person_id
) tx_stats ON (p1.person_id = tx_stats.sender_person_id AND p2.person_id = tx_stats.receiver_person_id)
LEFT JOIN (
    SELECT
        cp1.person_id AS person_1,
        cp2.person_id AS person_2,
        COUNT(DISTINCT cp1.case_id) AS case_overlap_count
    FROM case_persons cp1
    JOIN case_persons cp2 ON cp1.case_id = cp2.case_id AND cp1.person_id <> cp2.person_id
    GROUP BY cp1.person_id, cp2.person_id
) shared_cases ON (p1.person_id = shared_cases.person_1 AND p2.person_id = shared_cases.person_2);

-- ----------------------------------------------------------------------------
-- 5. CASE TIMELINE VIEW (SYNTHESIZED CHRONOLOGY)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_case_timeline AS
SELECT
    ev.event_id,
    ev.case_id,
    c.case_number,
    ev.event_timestamp,
    ev.event_type,
    ev.description,
    ev.source AS event_source,
    loc.name AS location_name,
    loc.city,
    loc.area,
    ev.primary_entity_type,
    ev.primary_entity_id,
    ev.secondary_entity_type,
    ev.secondary_entity_id,
    ev.evidence_id,
    ev.metadata
FROM events ev
JOIN cases c ON ev.case_id = c.case_id
LEFT JOIN locations loc ON ev.location_id = loc.location_id
ORDER BY ev.case_id, ev.event_timestamp ASC;

-- ----------------------------------------------------------------------------
-- 6. VEHICLE MOVEMENT HISTORY VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_vehicle_movement_history AS
SELECT
    v.vehicle_id,
    v.registration_number,
    v.vin,
    v.make,
    v.model,
    v.year,
    v.color,
    v.stolen_status,
    p.person_id AS owner_person_id,
    p.full_name AS owner_name,
    d.detection_id,
    d.detected_at,
    cam.camera_code,
    cam.camera_name,
    cam.source AS camera_source,
    loc.location_id,
    loc.name AS location_name,
    loc.city,
    loc.area,
    loc.latitude,
    loc.longitude,
    d.confidence,
    d.image_reference,
    d.event_metadata
FROM vehicles v
LEFT JOIN persons p ON v.owner_person_id = p.person_id
JOIN cctv_detections d ON v.vehicle_id = d.vehicle_id
JOIN cctv_cameras cam ON d.camera_id = cam.camera_id
JOIN locations loc ON cam.location_id = loc.location_id
ORDER BY v.vehicle_id, d.detected_at ASC;

-- ----------------------------------------------------------------------------
-- 7. LOCATION ACTIVITY & THREAT INDEX VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_location_activity AS
SELECT
    loc.location_id,
    loc.name AS location_name,
    loc.address,
    loc.city,
    loc.area,
    loc.location_type,
    loc.risk_level,
    loc.latitude,
    loc.longitude,
    COALESCE(inc.incident_count, 0) AS total_incidents,
    COALESCE(cam.camera_count, 0) AS active_cctv_cameras,
    COALESCE(det.detection_count, 0) AS total_cctv_detections,
    COALESCE(pl.observation_count, 0) AS total_person_sightings,
    COALESCE(calls.call_count, 0) AS total_cell_pings,
    COALESCE(tx.transaction_count, 0) AS total_financial_transactions
FROM locations loc
LEFT JOIN (
    SELECT location_id, COUNT(*) AS incident_count
    FROM incidents
    GROUP BY location_id
) inc ON loc.location_id = inc.location_id
LEFT JOIN (
    SELECT location_id, COUNT(*) AS camera_count
    FROM cctv_cameras
    WHERE status = 'active'
    GROUP BY location_id
) cam ON loc.location_id = cam.location_id
LEFT JOIN (
    SELECT c.location_id, COUNT(*) AS detection_count
    FROM cctv_detections d
    JOIN cctv_cameras c ON d.camera_id = c.camera_id
    GROUP BY c.location_id
) det ON loc.location_id = det.location_id
LEFT JOIN (
    SELECT location_id, COUNT(*) AS observation_count
    FROM person_locations
    GROUP BY location_id
) pl ON loc.location_id = pl.location_id
LEFT JOIN (
    SELECT location_id, COUNT(*) AS call_count
    FROM (
        SELECT originating_location_id AS location_id FROM call_records WHERE originating_location_id IS NOT NULL
        UNION ALL
        SELECT destination_location_id AS location_id FROM call_records WHERE destination_location_id IS NOT NULL
    ) c_loc
    GROUP BY location_id
) calls ON loc.location_id = calls.location_id
LEFT JOIN (
    SELECT location_id, COUNT(*) AS transaction_count
    FROM transactions
    WHERE location_id IS NOT NULL
    GROUP BY location_id
) tx ON loc.location_id = tx.location_id;

-- ----------------------------------------------------------------------------
-- 8. CROSS-CASE CONNECTIONS VIEW (INTELLIGENCE PATTERNS)
-- ----------------------------------------------------------------------------
-- Uncovers hidden patterns between different cases sharing suspects, vehicles,
-- or direct phone/transaction linkages.
CREATE OR REPLACE VIEW v_cross_case_connections AS
-- 1. Shared Suspects across cases
SELECT
    cp1.case_id AS case_a_id,
    c1.case_number AS case_a_number,
    c1.title AS case_a_title,
    cp2.case_id AS case_b_id,
    c2.case_number AS case_b_number,
    c2.title AS case_b_title,
    'SHARED_SUSPECT' AS connection_type,
    p.person_id AS entity_id,
    p.full_name AS entity_name,
    'Person appears as ' || cp1.relationship_type || ' in Case A and ' || cp2.relationship_type || ' in Case B' AS connection_details,
    0.9500::NUMERIC(5,4) AS connection_confidence
FROM case_persons cp1
JOIN case_persons cp2 ON cp1.person_id = cp2.person_id AND cp1.case_id < cp2.case_id
JOIN cases c1 ON cp1.case_id = c1.case_id
JOIN cases c2 ON cp2.case_id = c2.case_id
JOIN persons p ON cp1.person_id = p.person_id
WHERE cp1.relationship_type IN ('suspect', 'person_of_interest')
  AND cp2.relationship_type IN ('suspect', 'person_of_interest')

UNION ALL

-- 2. Shared Vehicle sighted at detections linked to distinct cases' incidents
SELECT
    inc1.case_id AS case_a_id,
    c1.case_number AS case_a_number,
    c1.title AS case_a_title,
    inc2.case_id AS case_b_id,
    c2.case_number AS case_b_number,
    c2.title AS case_b_title,
    'SHARED_VEHICLE_NEAR_INCIDENT' AS connection_type,
    v.vehicle_id AS entity_id,
    v.registration_number || ' (' || v.make || ' ' || v.model || ')' AS entity_name,
    'Vehicle detected on CCTV near incident in Case A and incident in Case B' AS connection_details,
    0.8800::NUMERIC(5,4) AS connection_confidence
FROM incidents inc1
JOIN incidents inc2 ON inc1.case_id < inc2.case_id AND inc1.case_id IS NOT NULL AND inc2.case_id IS NOT NULL
JOIN cases c1 ON inc1.case_id = c1.case_id
JOIN cases c2 ON inc2.case_id = c2.case_id
JOIN cctv_cameras cam1 ON inc1.location_id = cam1.location_id
JOIN cctv_cameras cam2 ON inc2.location_id = cam2.location_id
JOIN cctv_detections det1 ON cam1.camera_id = det1.camera_id AND det1.vehicle_id IS NOT NULL
JOIN cctv_detections det2 ON cam2.camera_id = det2.camera_id AND det2.vehicle_id = det1.vehicle_id
JOIN vehicles v ON det1.vehicle_id = v.vehicle_id
WHERE ABS(EXTRACT(EPOCH FROM (det1.detected_at - inc1.occurred_at))) < 7200 -- within 2 hours
  AND ABS(EXTRACT(EPOCH FROM (det2.detected_at - inc2.occurred_at))) < 7200

UNION ALL

-- 3. Direct Phone Communication between suspects of separate cases
SELECT
    cp1.case_id AS case_a_id,
    c1.case_number AS case_a_number,
    c1.title AS case_a_title,
    cp2.case_id AS case_b_id,
    c2.case_number AS case_b_number,
    c2.title AS case_b_title,
    'SUSPECT_COMMUNICATION' AS connection_type,
    cr.call_id AS entity_id,
    p1.full_name || ' <-> ' || p2.full_name AS entity_name,
    'Suspect in Case A communicated with suspect in Case B (' || cr.call_type || ', duration: ' || cr.duration_seconds || 's)' AS connection_details,
    0.9200::NUMERIC(5,4) AS connection_confidence
FROM call_records cr
JOIN case_persons cp1 ON cr.caller_person_id = cp1.person_id AND cp1.relationship_type IN ('suspect', 'person_of_interest')
JOIN case_persons cp2 ON cr.receiver_person_id = cp2.person_id AND cp2.relationship_type IN ('suspect', 'person_of_interest') AND cp1.case_id <> cp2.case_id
JOIN cases c1 ON cp1.case_id = c1.case_id
JOIN cases c2 ON cp2.case_id = c2.case_id
JOIN persons p1 ON cr.caller_person_id = p1.person_id
JOIN persons p2 ON cr.receiver_person_id = p2.person_id
WHERE cp1.case_id < cp2.case_id;

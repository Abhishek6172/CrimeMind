# CrimeMind: Complete PostgreSQL Intelligence Database Layer

**CrimeMind** is an AI-assisted crime investigation and intelligence platform engineered to assist authorized investigators, detectives, and intelligence analysts in organizing evidence, discovering non-obvious connections between entities, analyzing historical and active incidents, and visualizing complex relationship networks.

> [!IMPORTANT]
> **Synthetic Data Disclaimer**: This database is designed for testing, demonstration, algorithm benchmarking, and LangGraph agent evaluation. All generated identities, phone numbers, license plates, financial transactions, and cases are **100% synthetic and fictional**. Never store real personally identifiable information (PII) in this demo environment.

---

## 📁 Repository Structure

```text
database/
├── schema/
│   ├── 001_extensions.sql       # pgcrypto, uuid-ossp, pg_trgm, btree_gin, unaccent
│   ├── 002_tables.sql           # 20 domain tables with UUID PKs and check constraints
│   ├── 003_indexes.sql          # B-tree, GIN trigram, composite, and graph traversal indexes
│   ├── 004_relationships.sql    # Foreign key constraints, cascading rules, update triggers
│   └── 005_views.sql            # 8 analytical views for REST APIs and graph dashboards
├── seed/
│   ├── generate_dataset.py      # Zero-dependency synthetic generator (100k+ records)
│   ├── seed_database.py         # Multi-driver high-speed COPY ingestion utility
│   └── synthetic_data_config.json # Configurable generation thresholds and scenarios
├── migrations/
│   ├── 001_initial_schema.sql   # Consolidated idempotent migration script
│   └── README.md                # Migration instructions
├── scripts/
│   ├── reset_db.py              # Clean schema rebuild and teardown utility
│   ├── backup_db.py             # Automated timestamped gzipped database backups
│   └── health_check.py          # Diagnostics for tables, views, latency, and scenarios
├── models/
│   └── README.md                # Entity modeling & LangGraph integration guide
├── .env.example                 # Configuration template
└── README.md                    # Setup and reference manual
```

---

## 🏛️ Core Architecture Principles

1. **Normalized Relational Integrity**: All 20 domain tables adhere to Third Normal Form (3NF) with UUID primary keys (`gen_random_uuid()`) and strict foreign key constraints.
2. **Immutable Raw Evidence**: Ingested surveillance, call detail records (CDRs), financial transactions, and physical evidence represent ground truth and cannot be modified by AI operations.
3. **Strict Separation of AI Findings**: Autonomous LangGraph agents record execution metrics in `agent_runs` and hypotheses in `ai_findings`. AI outputs **never overwrite raw evidence**.
4. **Graph-Native Querying**: The `relationships` edge table enables sub-millisecond multi-hop graph traversal across heterogeneous nodes without requiring an external graph database.
5. **Unified Timeline Sequencing**: The `events` table standardizes disparate telemetry (CCTV detections, phone calls, ATM withdrawals, police statements, crime occurrences) into a chronological event stream.

---

## 📊 Summary of the 20 Relational Tables

| Table | Primary Key | Description |
|---|---|---|
| `users` | `user_id` (UUID) | System investigators, analysts, supervisors, administrators |
| `locations` | `location_id` (UUID) | Spatial hotspots, cities, commercial facilities, street addresses |
| `cases` | `case_id` (UUID) | Master investigative case files and operational dossiers |
| `persons` | `person_id` (UUID) | Synthetic person profiles, aliases, risk levels, and demographic data |
| `case_persons` | `case_person_id` (UUID) | Junction mapping persons to cases (suspect, victim, witness, POI) |
| `incidents` | `incident_id` (UUID) | Individual crime occurrences, severity levels, and modus operandi |
| `vehicles` | `vehicle_id` (UUID) | Synthetic plates, VINs, makes, models, colors, and registered owners |
| `cctv_cameras` | `camera_id` (UUID) | Surveillance cameras, municipal sources, feeds, and locations |
| `cctv_detections` | `detection_id` (UUID) | Timestamped object/person/vehicle detections with bounding boxes |
| `evidence` | `evidence_id` (UUID) | Physical/digital evidence items, hashes, and chain of custody logs |
| `statements` | `statement_id` (UUID) | Transcripts of formal interrogations, witness interviews, 911 calls |
| `call_records` | `call_id` (UUID) | Telecom CDR logs, durations, cell tower IDs, and caller/receiver pings |
| `transactions` | `transaction_id` (UUID) | Banking transfers, crypto OTC swaps, POS purchases, ATM activity |
| `person_locations` | `observation_id` (UUID) | Historical person observations, sightings, and sensor tracking |
| `relationships` | `relationship_id` (UUID) | Generic graph edges linking persons, vehicles, cases, and evidence |
| `events` | `event_id` (UUID) | Unified chronological timeline events across all investigative domains |
| `agent_runs` | `run_id` (UUID) | Execution records for LangGraph autonomous reasoning agents |
| `ai_findings` | `finding_id` (UUID) | AI-generated hypotheses, anomalies, and human verification status |
| `investigation_notes` | `note_id` (UUID) | Detective briefings, supervisor notes, and confidential tags |
| `audit_logs` | `log_id` (UUID) | System-wide audit trail recording who accessed or modified data |

---

## 🔎 The 8 Analytical SQL Views

1. **`v_case_overview`**: Master case management view with aggregate counts for suspects, victims, witnesses, physical evidence, unverified AI findings, and latest activity timestamp.
2. **`v_person_investigation_profile`**: 360-degree suspect profile consolidating associated cases, registered vehicles, CCTV sightings, suspicious transaction totals, and direct network size.
3. **`v_evidence_summary`**: Case evidence breakdown by modality (documents, images, videos, audio, forensic reports, weapons) with collection time boundaries.
4. **`v_person_relationship_graph`**: Graph edge view calculating direct calls, financial transfers, shared case overlaps, and confidence scores between persons.
5. **`v_case_timeline`**: Synthesized chronological event stream for a case, merging incidents, CCTV detections, calls, money transfers, and evidence seizure.
6. **`v_vehicle_movement_history`**: Chronological breadcrumb trail of vehicle detections across CCTV cameras with GPS coordinates and timestamps.
7. **`v_location_activity`**: Geospatial hotspot analysis summarizing crime incidents, active cameras, detections, cell pings, and transaction volume per venue.
8. **`v_cross_case_connections`**: Cross-case intelligence view identifying cases linked by shared suspects, shared vehicles, or direct suspect-to-suspect communication.

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- **PostgreSQL 14+** (PostgreSQL 16 recommended)
- **Python 3.9+** (Standard library is sufficient for generation; `psycopg2` or `psycopg` recommended for direct script seeding)
- *Optional*: Docker and Docker Compose

### 2. Environment Configuration
Copy the configuration template:
```bash
cp .env.example .env
```
Ensure `.env` matches your database credentials:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crimemind
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=crimemind
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### 3. Starting PostgreSQL with Docker (Quick Start)
If you do not have a local PostgreSQL instance running:
```bash
docker compose up -d
```

### 4. Deploying the Database Schema
You can initialize the schema using `psql` or the Python reset script:

**Option A (Using psql CLI)**:
```bash
psql -h localhost -U postgres -d crimemind -f database/migrations/001_initial_schema.sql
```

**Option B (Using the Python Reset Script)**:
```bash
python database/scripts/reset_db.py --force
```

---

## 🎲 Generating & Seeding the Synthetic Dataset

The generator is capable of synthesizing the full production-scale dataset with zero external Python dependencies.

### Dataset Scale Targets
- **10,000+** Synthetic Persons
- **2,000+** Cases
- **5,000+** Incidents
- **5,000+** Vehicles
- **20,000+** Evidence Records
- **50,000+** Graph Relationships
- **50,000+** Call Detail Records
- **50,000+** Financial Transactions
- **100,000+** CCTV Detections
- **100,000+** Unified Timeline Events
- **Users, Locations, Cameras, Statements, Notes, AI Findings**

### Step 1: Run the Dataset Generator
```bash
# Generate full scale dataset (exports CSV and SQL)
python database/seed/generate_dataset.py --scale 1.0

# Or generate a quick test scale (0.1 scale)
python database/seed/generate_dataset.py --scale 0.1
```

### Step 2: Seed the Database
```bash
# High-speed COPY stream ingestion
python database/seed/seed_database.py
```

### Step 3: Run Database Health Check
```bash
python database/scripts/health_check.py
```

---

## 🕵️ Demo Scenarios & Investigative Verification Queries

The synthetic generator embeds 5 interconnected fictional criminal scenarios designed for automated intelligence discovery.

### Scenario 1: The Midnight Syndicate (Repeated Burglary Network)
- **Description**: An organized burglary crew coordinated by master fence Marcus "Viper" Vance and locksmith Julian "Ghost" Drake systematically target luxury residences with an identical modus operandi across 8 cases.
- **Verification Query**:
```sql
SELECT
    c.case_number,
    c.title,
    p.full_name AS suspect_name,
    cp.relationship_type,
    inc.modus_operandi
FROM cases c
JOIN case_persons cp ON c.case_id = cp.case_id
JOIN persons p ON cp.person_id = p.person_id
JOIN incidents inc ON c.case_id = inc.case_id
WHERE c.metadata->>'scenario' = 'SCENARIO_1_BURGLARY_NETWORK'
ORDER BY c.opened_at ASC;
```

---

### Scenario 2: Phantom Charger (Vehicle Appearing Near Multiple Incidents)
- **Description**: A Dark Gray 2021 Dodge Charger (Plate: `SYN-7X91`) registered to Damian Cross is logged by municipal CCTV cameras within 20 minutes before and 15 minutes after 4 distinct commercial armed robberies.
- **Verification Query**:
```sql
SELECT
    v.registration_number,
    v.make,
    v.model,
    p.full_name AS registered_owner,
    d.detected_at,
    cam.camera_code,
    cam.camera_name,
    loc.address AS sighting_location,
    d.confidence,
    d.event_metadata->>'speed_kmh' AS speed_kmh
FROM vehicles v
JOIN persons p ON v.owner_person_id = p.person_id
JOIN cctv_detections d ON v.vehicle_id = d.vehicle_id
JOIN cctv_cameras cam ON d.camera_id = cam.camera_id
JOIN locations loc ON cam.location_id = loc.location_id
WHERE v.registration_number = 'SYN-7X91'
ORDER BY d.detected_at ASC;
```

---

### Scenario 3: Cipher Nexus (Person Communicating with Multiple Suspects)
- **Description**: Evelyn Reed ("Cipher") acts as an untracked clandestine broker, maintaining encrypted phone contact with 7 prime suspects across 5 unrelated ongoing cases.
- **Verification Query**:
```sql
SELECT
    caller.full_name AS broker,
    receiver.full_name AS suspect,
    receiver.risk_level,
    cr.call_timestamp,
    cr.duration_seconds,
    cr.call_type,
    cr.tower_metadata->>'cell_tower_id' AS cell_tower
FROM call_records cr
JOIN persons caller ON cr.caller_person_id = caller.person_id
JOIN persons receiver ON cr.receiver_person_id = receiver.person_id
WHERE caller.full_name = 'Evelyn Reed'
ORDER BY cr.call_timestamp ASC;
```

---

### Scenario 4: Pre-Strike Funding to Vault Infiltration
- **Description**: Trevor Bennett receives a $25,000 wire transfer from an offshore account. 3 hours later, he pings a nearby cell tower and is detected on CCTV outside the First National Bank branch vault 45 minutes prior to the silent alarm breach in `CASE-2024-0771`.
- **Verification Query**:
```sql
-- Step A: The financial wire
SELECT
    t.transaction_timestamp,
    s.full_name AS sender,
    r.full_name AS receiver,
    t.amount,
    t.transaction_type,
    t.is_flagged_suspicious
FROM transactions t
JOIN persons s ON t.sender_person_id = s.person_id
JOIN persons r ON t.receiver_person_id = r.person_id
WHERE r.full_name = 'Trevor Bennett';

-- Step B: The CCTV detection near the bank vault
SELECT
    d.detected_at,
    p.full_name,
    cam.camera_name,
    loc.name AS location_name,
    d.detected_object,
    d.confidence
FROM cctv_detections d
JOIN persons p ON d.person_id = p.person_id
JOIN cctv_cameras cam ON d.camera_id = cam.camera_id
JOIN locations loc ON cam.location_id = loc.location_id
WHERE p.full_name = 'Trevor Bennett'
ORDER BY d.detected_at ASC;
```

---

### Scenario 5: The Recidivist Anchor (Historical to Active Case Linkage)
- **Description**: Viktor Orlov ("Old Fox"), convicted in closed 2021 case `CASE-2021-0044`, resurfaces in active 2024 container breach investigation `CASE-2024-2390` driving his registered Black Ford Explorer (`SYN-4K82`).
- **Verification Query**:
```sql
SELECT
    c.case_number,
    c.title,
    c.status AS case_status,
    c.opened_at,
    p.full_name AS person_name,
    cp.relationship_type,
    v.registration_number AS vehicle_plate,
    v.make || ' ' || v.model AS vehicle_model
FROM cases c
JOIN case_persons cp ON c.case_id = cp.case_id
JOIN persons p ON cp.person_id = p.person_id
LEFT JOIN vehicles v ON v.owner_person_id = p.person_id
WHERE p.full_name = 'Viktor Orlov'
ORDER BY c.opened_at ASC;
```

---

## 🤖 LangGraph & AI Agent Workflow Integration

CrimeMind's database is explicitly partitioned so that LangGraph agents can consume raw data and publish findings safely:

```python
# Sample LangGraph Tool: Read from CrimeMind, Write Finding to AI layer
import psycopg2
import json

def analyze_cross_case_patterns(case_id: str, db_connection):
    cursor = db_connection.cursor()

    # Query cross-case intelligence view
    cursor.execute("""
        SELECT case_b_number, connection_type, entity_name, connection_details, connection_confidence
        FROM v_cross_case_connections
        WHERE case_a_id = %s OR case_b_id = %s
    """, (case_id, case_id))

    matches = cursor.fetchall()
    for match in matches:
        case_b_no, conn_type, entity, details, conf = match

        # Autonomous Agent logs AI finding separately without altering raw tables
        cursor.execute("""
            INSERT INTO ai_findings (
                case_id, agent_name, finding_type, title,
                finding_text, confidence, supporting_evidence_ids, supporting_entity_references
            ) VALUES (%s, %s, %s, %s, %s, %s, '[]'::jsonb, '[]'::jsonb)
        """, (
            case_id,
            "CrossCaseMatcherAgent",
            "cross_case_match",
            f"Cross-Case Link with {case_b_no}",
            f"Agent detected {conn_type} via {entity}: {details}",
            float(conf)
        ))

    db_connection.commit()
```

---

## 🛠️ Operational Maintenance Scripts

### Reset Database
```bash
# Teardown all tables, re-execute 001-005 schema, and optionally seed
python database/scripts/reset_db.py --force --seed --scale 1.0
```

### Create Compressed Database Backup
```bash
# Generates timestamped, compressed backup in database/backups/
python database/scripts/backup_db.py --compress
```

### Health Check & Integrity Diagnostics
```bash
# Validates database connection, table row counts, views, and scenario presence
python database/scripts/health_check.py
```

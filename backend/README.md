# CrimeMind Intelligence Platform — Backend Engine

The backend for **CrimeMind** is a production-quality, asynchronous forensic intelligence API built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, and a **LangGraph 9-Agent Multi-Agent Orchestrator**.

---

## 🏛️ Architecture Overview

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entrypoint & top-level WebSockets
│   ├── config.py                # Pydantic v2 environment settings
│   ├── database/
│   │   ├── base.py              # DeclarativeBase setup
│   │   └── session.py           # Engine & SessionLocal provider
│   ├── models/                  # Exact SQLAlchemy models matching PostgreSQL schema
│   │   ├── user.py              # Users & access roles
│   │   ├── case.py              # Cases & CasePersons
│   │   ├── person.py            # Persons & PersonLocations
│   │   ├── incident.py          # Incidents / Crimes
│   │   ├── vehicle.py           # Registered vehicles & ANPR plates
│   │   ├── cctv.py              # Optical cameras & detections
│   │   ├── evidence.py          # Vaulted evidence & custody logs
│   │   ├── communication.py     # Statements, call records (CDRs), transactions
│   │   ├── relationship.py      # Generic knowledge graph edges
│   │   └── intelligence.py      # Events, AgentRuns, AIFindings, Notes, AuditLogs
│   ├── schemas/                 # Strict Pydantic v2 validation contracts
│   ├── routers/                 # Modular API endpoints
│   │   ├── auth.py              # JWT authentication & investigator roles
│   │   ├── cases.py             # Case dossier CRUD & subtab queries
│   │   ├── persons.py           # Biometrics, dossiers, associates, and calls
│   │   ├── evidence.py          # Evidence ingestion & SHA-256 upload pipeline
│   │   ├── vehicles.py          # Vehicle registrations & ANPR license hits
│   │   ├── locations.py         # Geotemporal points & movement sequences
│   │   ├── cctv.py              # Optical feeds & reference image matcher
│   │   ├── calls.py             # Intercepted CDRs & cell tower azimuths
│   │   ├── transactions.py      # Financial wires & AML anomaly alerts
│   │   ├── graph.py             # Interactive SVG/canvas relationship graph
│   │   ├── timeline.py          # Unified multi-modal chronological timeline
│   │   ├── alerts.py            # Tactical alert feed with mandatory source evidence
│   │   ├── analytics.py         # Crime categories, trends, and ANPR recurrence
│   │   ├── agents.py            # LangGraph 9-agent DAG swarm status & triggers
│   │   ├── assistant.py         # SSE token streaming, voice transcribe & speak
│   │   └── intelligence.py      # Cross-case forensic query endpoints
│   ├── services/                # Business logic & orchestration
│   │   ├── audit_service.py     # Immutable audit trails (AI never overwrites raw data)
│   │   ├── case_service.py      # Case dossier operations
│   │   ├── person_service.py    # Biometric suspect retrieval
│   │   ├── evidence_service.py  # Forensic upload & SHA-256 hashing pipeline
│   │   ├── graph_service.py     # Knowledge graph constructor
│   │   ├── timeline_service.py  # Multi-modal chronometry aggregator
│   │   ├── path_analysis_service.py # Movement reconstruction with legal safeguards
│   │   ├── intelligence_service.py  # 360-degree cross-case synthesis
│   │   ├── langgraph_service.py # 9-agent DAG orchestrator with SSE streaming
│   │   └── voice_service.py     # Audio transcription & tactical speech synthesis
│   ├── repositories/            # Generic CRUD data access repositories
│   ├── middleware/              # Audit logging & rate-limiting middleware
│   ├── websocket/               # WebSocket connection manager
│   └── utils/
│       ├── security.py          # Passlib bcrypt & python-jose JWT handling
│       └── file_processor.py    # Forensic upload pipeline & MIME validator
├── tests/                       # Unit and integration pytest suite
├── uploads/                     # Secure local vault for ingested evidence
├── requirements.txt             # Python package dependencies
├── .env.example                 # Configuration template
├── Dockerfile                   # Production container definition
└── README.md
```

---

## ⚡ Core Principles & Safeguards

1. **Investigative Assistance Rule**: AI outputs and inferred movement vectors are strictly labeled as investigative assistance and **MUST NOT** be recorded as established facts.
2. **Raw Evidence Immutability**: AI findings are stored in the separate `ai_findings` table and **NEVER** overwrite raw immutable evidence records or timestamps.
3. **Mandatory Audit Logging**: Every `INSERT`, `UPDATE`, and `DELETE` operation creates an immutable audit record in `audit_logs`.
4. **Source Evidence Traceability**: Every tactical alert explicitly references its source evidence artifact or optical frame.

---

## 🤖 LangGraph 9-Agent Multi-Agent Workflow

```
Investigative Query
        │
        ▼
   [Planner]  (Query decomposition & DAG orchestration)
        │
 ┌──────┴───────────────────────────────────────────────────────┐
 │                                                              │
 ▼ (Parallel Extraction)                                        ▼
[Case Agent]      [Person Agent]   [Evidence Agent]   [CCTV Agent]
[Graph Agent]     [Timeline Agent] [Law & Policy Retrieval Agent]
 │                                                              │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
                       [Synthesis Agent]
                  (Token-by-Token SSE Stream)
```

The assistant streams lifecycle milestones in real-time:
`agent_started` → `agent_progress` → `agent_result` → `token` → `final_synthesis`.

---

## 🚀 Running the Backend

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Redoc Documentation: `http://localhost:8000/redoc`
- Liveness Probe: `http://localhost:8000/health`

### 4. Running Tests
```bash
cd backend
pytest -v
```

### 5. Running with Docker Compose
From the project root:
```bash
docker-compose up --build
```
This spins up both the **PostgreSQL** database and the **FastAPI backend** container with live code reload.

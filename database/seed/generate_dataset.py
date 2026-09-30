#!/usr/bin/env python3
"""
==============================================================================
CrimeMind Synthetic Dataset Generator
File: generate_dataset.py
Description: Generates realistic, fully synthetic data for the CrimeMind
             investigation & intelligence database layer.
             Implements 5 rich demo scenarios and deep interconnected graphs:
             - 10,000+ Persons
             - 2,000+ Cases
             - 5,000+ Incidents
             - 5,000+ Vehicles
             - 20,000+ Evidence records
             - 50,000+ Graph Relationships
             - 50,000+ Call Detail Records
             - 50,000+ Financial Transactions
             - 100,000+ CCTV Detections
             - 100,000+ Unified Timeline Events
             - Plus Users, Locations, Cameras, Statements, Notes, AI Findings

Zero external dependencies required (Pure Python standard library).
==============================================================================
"""

import argparse
import csv
import datetime
import hashlib
import json
import math
import os
import random
import sys
import uuid

# ----------------------------------------------------------------------------
# 1. SYNTHETIC VOCABULARY & CORPUS DEFINITIONS
# ----------------------------------------------------------------------------

FIRST_NAMES_MALE = [
    "James", "Marcus", "Julian", "Ray", "Leo", "Derrick", "Damian", "Trevor",
    "Viktor", "Lucas", "Alexander", "Nathan", "Ethan", "Gabriel", "Malcolm",
    "Dominic", "Arthur", "Vincent", "Carlos", "Dante", "Felix", "Leon", "Mateo",
    "Roman", "Stefan", "Xavier", "Zane", "Caleb", "Elias", "Hugo", "Jesse",
    "Adrian", "Troy", "Devon", "Enzo", "Gideon", "Jasper", "Kieran", "Nico"
]

FIRST_NAMES_FEMALE = [
    "Evelyn", "Elena", "Sophia", "Maya", "Clara", "Serena", "Nadia", "Valerie",
    "Carmen", "Iris", "Selena", "Vivian", "Diana", "Naomi", "Rowan", "Zara",
    "Camilla", "Astrid", "Brianna", "Chloe", "Fiona", "Giselle", "Helena",
    "Ingrid", "Jocelyn", "Kendra", "Lila", "Miriam", "Noelle", "Raven", "Talia"
]

LAST_NAMES = [
    "Vance", "Drake", "Miller", "Ortiz", "Hayes", "Cross", "Bennett", "Orlov",
    "Kovacs", "Moretti", "Sterling", "Mercer", "Blackwood", "Chen", "Sloan",
    "Castillo", "Novak", "Sinclair", "Vargas", "Whitaker", "Gallagher", "Holloway",
    "Kearney", "Lombardi", "Navarro", "Pemberton", "Quinn", "Reyes", "Stratton",
    "Trevino", "Underwood", "Valdez", "Winter", "York", "Zimmerman", "Fontana"
]

CRIMINAL_ALIASES = [
    "Viper", "Ghost", "Crowbar", "Nails", "Shadow", "Apex", "Spike", "Old Fox",
    "Cipher", "Razor", "Phantom", "Hawk", "Jackal", "Bishop", "Rook", "Hammer",
    "Specter", "Echo", "Frost", "Grit", "Bullet", "Snake", "Zero", "Diesel"
]

OCCUPATIONS = [
    "Warehouse Supervisor", "Automotive Mechanic", "Logistics Courier",
    "Private Security Contractor", "Commercial Electrician", "Dock Worker",
    "Nightclub Bartender", "Scrap Metal Dealer", "Software Developer",
    "Accountant", "Pawn Shop Operator", "Real Estate Broker", "Truck Driver",
    "Used Car Salesman", "Construction Foreman", "Electronics Technician",
    "Restaurant Manager", "Fitness Trainer", "Locksmith", "Civil Engineer"
]

CRIME_TYPES = [
    "Aggravated Burglary", "Commercial Robbery", "Armed Bank Robbery",
    "Grand Theft Auto", "Organized Cargo Theft", "Wire Fraud & Embezzlement",
    "Cryptocurrency Laundering", "Extortion & Racketeering", "Narcotics Distribution",
    "Illegal Arms Trafficking", "Cyber Infiltration & Ransomware", "Identity Fraud Network"
]

LOCATION_TYPES = [
    "residential", "commercial", "industrial", "public_transit",
    "atm_bank", "street_corner", "warehouse", "hideout",
    "port_marina", "government_facility", "entertainment_venue"
]

DISTRICTS = [
    "Downtown Commercial District",
    "Northshore Heights",
    "Industrial Waterfront & Port",
    "Eastside Arts Corridor",
    "West End Suburbs",
    "South Bay Logistics Hub",
    "Midtown Financial Plaza",
    "Old Town Heritage Ward",
    "Silver Lake Tech Park",
    "Harbor Point Terminal"
]

STREET_NAMES = [
    "Lexington Ave", "St. Marks Place", "Vanderbilt Way", "Industrial Boulevard",
    "Harbor View Drive", "Pier 42 Access Rd", "Beacon Street", "Atlantic Avenue",
    "Highland Boulevard", "Sunset Parkway", "Commerce Expressway", "River Road",
    "Foundry Street", "Quarry Lane", "Grand Concourse", "Canal Promenade"
]

VEHICLE_MAKES_MODELS = [
    ("Dodge", "Charger", "sedan"),
    ("Ford", "Explorer", "suv"),
    ("Chevrolet", "Tahoe", "suv"),
    ("Toyota", "Camry", "sedan"),
    ("Honda", "Civic", "sedan"),
    ("BMW", "X5", "suv"),
    ("Audi", "A6", "sedan"),
    ("Mercedes-Benz", "Sprinter", "van"),
    ("Ford", "F-150", "truck"),
    ("Nissan", "Altima", "sedan"),
    ("Jeep", "Grand Cherokee", "suv"),
    ("Yamaha", "MT-09", "motorcycle"),
    ("Freightliner", "Cascadia", "commercial_truck")
]

COLORS = ["Black", "Dark Gray", "Silver", "Midnight Blue", "White", "Crimson Red", "Forest Green", "Charcoal"]

EVIDENCE_TYPES = [
    "documents", "images", "videos", "audio", "forensic_records",
    "digital_files", "transaction_records", "call_records", "cctv_records",
    "statements", "physical_weapons", "fingerprints", "dna_samples"
]

# ----------------------------------------------------------------------------
# 2. SEED GENERATOR ENGINE CLASS
# ----------------------------------------------------------------------------

class CrimeMindDataGenerator:
    def __init__(self, scale=1.0, seed=42, output_dir="data"):
        self.scale = max(0.01, float(scale))
        self.seed = int(seed)
        self.output_dir = output_dir
        random.seed(self.seed)

        # Scale target metrics
        self.counts = {
            "users": max(20, int(100 * self.scale)),
            "locations": max(100, int(1200 * self.scale)),
            "cctv_cameras": max(200, int(2500 * self.scale)),
            "persons": max(500, int(10000 * self.scale)),
            "vehicles": max(300, int(5000 * self.scale)),
            "cases": max(100, int(2000 * self.scale)),
            "incidents": max(250, int(5000 * self.scale)),
            "case_persons": max(600, int(12000 * self.scale)),
            "evidence": max(1000, int(20000 * self.scale)),
            "statements": max(400, int(8000 * self.scale)),
            "relationships": max(2500, int(50000 * self.scale)),
            "call_records": max(2500, int(50000 * self.scale)),
            "transactions": max(2500, int(50000 * self.scale)),
            "cctv_detections": max(5000, int(100000 * self.scale)),
            "person_locations": max(2000, int(40000 * self.scale)),
            "timeline_events": max(5000, int(100000 * self.scale)),
            "agent_runs": max(100, int(2000 * self.scale)),
            "ai_findings": max(200, int(4000 * self.scale)),
            "investigation_notes": max(400, int(8000 * self.scale)),
            "audit_logs": max(500, int(15000 * self.scale)),
        }

        # Memory stores for relational cross-referencing
        self.users = []
        self.locations = []
        self.cctv_cameras = []
        self.persons = []
        self.vehicles = []
        self.cases = []
        self.incidents = []
        self.case_persons = []
        self.evidence = []
        self.statements = []
        self.relationships = []
        self.call_records = []
        self.transactions = []
        self.cctv_detections = []
        self.person_locations = []
        self.timeline_events = []
        self.agent_runs = []
        self.ai_findings = []
        self.investigation_notes = []
        self.audit_logs = []

        # Scenario Specific Anchors
        self.scenario_anchors = {}

        # Coordinate bounding box for Metropolis Central
        self.lat_min = 40.6800
        self.lat_max = 40.8800
        self.lon_min = -74.0500
        self.lon_max = -73.8500

        # Base time window: Jan 1, 2021 to Sep 1, 2024
        self.start_dt = datetime.datetime(2021, 1, 1, 0, 0, 0)
        self.end_dt = datetime.datetime(2024, 9, 1, 0, 0, 0)
        self.total_seconds = int((self.end_dt - self.start_dt).total_seconds())

    def _random_dt(self, start=None, end=None):
        if start is None:
            start = self.start_dt
        if end is None:
            end = self.end_dt
        delta = int((end - start).total_seconds())
        if delta <= 0:
            return start
        return start + datetime.timedelta(seconds=random.randint(0, delta))

    def _random_hash(self, salt=""):
        return hashlib.sha256(f"{random.random()}-{uuid.uuid4()}-{salt}".encode()).hexdigest()

    def _random_phone(self):
        return f"+1-555-{random.randint(100, 999):03d}-{random.randint(1000, 9999):04d}"

    def _random_plate(self):
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"
        nums = "0123456789"
        return f"SYN-{random.choice(nums)}{random.choice(chars)}{random.choice(chars)}{random.choice(nums)}"

    def _random_vin(self):
        chars = "0123456789ABCDEFGHJKLMNPRSTUVWXYZ"
        return "1SYN" + "".join(random.choices(chars, k=13))

    def _random_coord(self):
        lat = round(random.uniform(self.lat_min, self.lat_max), 7)
        lon = round(random.uniform(self.lon_min, self.lon_max), 7)
        return lat, lon

    # ------------------------------------------------------------------------
    # STEP 1: Generate Users
    # ------------------------------------------------------------------------
    def generate_users(self):
        print(f"[*] Generating {self.counts['users']} users (investigators, analysts, admins)...")
        roles = ["investigator", "analyst", "supervisor", "forensic_specialist", "administrator"]
        for i in range(self.counts["users"]):
            uid = str(uuid.uuid4())
            gender = random.choice(["male", "female"])
            first = random.choice(FIRST_NAMES_MALE if gender == "male" else FIRST_NAMES_FEMALE)
            last = random.choice(LAST_NAMES)
            full_name = f"{first} {last}"
            username = f"{first.lower()}.{last.lower()}{i:03d}"
            role = roles[i % len(roles)] if i >= 5 else roles[i]
            badge = f"SHERIFF-{1000 + i:04d}" if role != "administrator" else None

            self.users.append({
                "user_id": uid,
                "username": username,
                "email": f"{username}@crimemind.internal",
                "password_hash": "$2b$12$e8Y6lP6xY6.G3gN1Gk2h6.vA7n3y0M7X3zF1Q7K0y4W2a5v8S1d2u",
                "full_name": full_name,
                "badge_number": badge,
                "role": role,
                "department": "Major Crimes Division" if role in ("investigator", "supervisor") else "Forensic & Intelligence Bureau",
                "is_active": True,
                "last_login_at": self._random_dt(datetime.datetime(2024, 1, 1), self.end_dt).isoformat(),
                "auth_metadata": json.dumps({"mfa_enabled": True, "clearance_level": "LEVEL_4_RESTRICTED"}),
                "created_at": self._random_dt(self.start_dt, datetime.datetime(2022, 1, 1)).isoformat(),
                "updated_at": self._random_dt(datetime.datetime(2024, 1, 1), self.end_dt).isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 2: Generate Locations
    # ------------------------------------------------------------------------
    def generate_locations(self):
        print(f"[*] Generating {self.counts['locations']} geographical locations...")
        for i in range(self.counts["locations"]):
            lid = str(uuid.uuid4())
            area = random.choice(DISTRICTS)
            street = f"{random.randint(10, 999)} {random.choice(STREET_NAMES)}"
            ltype = random.choice(LOCATION_TYPES)
            lat, lon = self._random_coord()
            risk = random.choices(["low", "moderate", "high", "extreme"], weights=[0.5, 0.3, 0.15, 0.05])[0]

            self.locations.append({
                "location_id": lid,
                "name": f"{area} {ltype.replace('_', ' ').title()} #{i+1}",
                "address": street,
                "city": "Metropolis Central",
                "area": area,
                "postal_code": f"MC-{10001 + (i % 250)}",
                "latitude": lat,
                "longitude": lon,
                "location_type": ltype,
                "risk_level": risk,
                "risk_metadata": json.dumps({
                    "cctv_coverage": "high" if risk in ("high", "extreme") else "standard",
                    "night_patrol_sector": f"SEC-{(i % 12) + 1:02d}",
                    "lighting_rating": "poor" if risk == "extreme" else "adequate"
                }),
                "created_at": self.start_dt.isoformat(),
                "updated_at": self.start_dt.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 3: Generate CCTV Cameras
    # ------------------------------------------------------------------------
    def generate_cctv_cameras(self):
        print(f"[*] Generating {self.counts['cctv_cameras']} CCTV cameras...")
        sources = ["municipal_surveillance", "traffic_police", "private_commercial",
                   "residential_ring", "atm_surveillance", "subway_transit", "highway_toll"]

        for i in range(self.counts["cctv_cameras"]):
            cid = str(uuid.uuid4())
            loc = random.choice(self.locations)
            source = random.choice(sources)
            code = f"CAM-{(i // 50) + 1:02d}-{i % 1000:03d}"

            self.cctv_cameras.append({
                "camera_id": cid,
                "location_id": loc["location_id"],
                "camera_name": f"{loc['area']} {source.replace('_', ' ').title()} Cam {i+1}",
                "camera_code": code,
                "source": source,
                "resolution": random.choice(["1080p", "4K", "1080p", "720p"]),
                "field_of_view": random.choice(["360_degree_dome", "northbound_entry", "southbound_exit", "pedestrian_walkway", "vault_corridor"]),
                "status": random.choices(["active", "maintenance", "offline"], weights=[0.92, 0.05, 0.03])[0],
                "rtsp_stream_synthetic_url": f"rtsp://streaming.internal.crimemind.net/live/{code.lower()}",
                "metadata": json.dumps({"fps": 30, "night_vision_ir": True, "pan_tilt_zoom": (i % 3 == 0)}),
                "created_at": self.start_dt.isoformat(),
                "updated_at": self.start_dt.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 4: Generate Synthetic Persons & Demo Scenarios
    # ------------------------------------------------------------------------
    def generate_persons_and_scenarios(self):
        print(f"[*] Generating {self.counts['persons']} synthetic person identities...")

        # A. Setup Demo Scenario Persons
        scenario_1_viper_id = str(uuid.uuid4())
        scenario_1_ghost_id = str(uuid.uuid4())
        scenario_1_crew_ids = [str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())]

        scenario_2_damian_id = str(uuid.uuid4())
        scenario_3_evelyn_id = str(uuid.uuid4())
        scenario_4_trevor_id = str(uuid.uuid4())
        scenario_5_viktor_id = str(uuid.uuid4())

        self.scenario_anchors = {
            "s1_viper": scenario_1_viper_id,
            "s1_ghost": scenario_1_ghost_id,
            "s1_crew": scenario_1_crew_ids,
            "s2_damian": scenario_2_damian_id,
            "s3_evelyn": scenario_3_evelyn_id,
            "s4_trevor": scenario_4_trevor_id,
            "s5_viktor": scenario_5_viktor_id,
        }

        # Defined Named Scenario Persons
        named_persons = [
            (scenario_1_viper_id, "Marcus", "Vance", ["Viper", "The Fence"], 44, "male", "Pawn Shop Operator", "extreme",
             ["prior_burglary_conviction", "weapons_affinity", "high_value_fencing", "money_laundering_suspect"]),
            (scenario_1_ghost_id, "Julian", "Drake", ["Ghost", "Keymaster"], 38, "male", "Locksmith", "high",
             ["master_locksmith_bypass", "alarm_suppression_expert", "counter_surveillance"]),
            (scenario_1_crew_ids[0], "Ray", "Miller", ["Crowbar"], 32, "male", "Demolition Specialist", "high",
             ["forced_entry_specialist", "prior_theft_arrests"]),
            (scenario_1_crew_ids[1], "Leo", "Ortiz", ["Nails"], 29, "male", "Automotive Mechanic", "high",
             ["lookout_driver", "telecom_jammer_operator"]),
            (scenario_1_crew_ids[2], "Derrick", "Hayes", ["Shadow"], 35, "male", "Commercial Electrician", "high",
             ["cctv_tampering", "circuit_breaker_bypass"]),
            (scenario_2_damian_id, "Damian", "Cross", ["Apex"], 33, "male", "Nightclub Security", "high",
             ["getaway_driver", "registered_owner_charger", "evasion_tactics"]),
            (scenario_3_evelyn_id, "Evelyn", "Reed", ["Cipher", "The Broker"], 41, "female", "Logistics Consultant", "extreme",
             ["clandestine_communications", "multi_syndicate_facilitator", "burner_nexus_hub"]),
            (scenario_4_trevor_id, "Trevor", "Bennett", ["Spike"], 27, "male", "Scrap Metal Sorter", "high",
             ["rapid_withdrawal_mule", "safe_breach_operative", "heavy_tooling"]),
            (scenario_5_viktor_id, "Viktor", "Orlov", ["Old Fox"], 58, "male", "Warehouse Overseer", "extreme",
             ["historical_convict_2021", "recidivist_syndicate_boss", "interstate_smuggler"])
        ]

        # Add Scenario persons
        for pid, first, last, aliases, age, gender, occ, risk, indicators in named_persons:
            phone = "+1-555-019-4821" if pid == scenario_3_evelyn_id else self._random_phone()
            self.persons.append({
                "person_id": pid,
                "first_name": first,
                "last_name": last,
                "full_name": f"{first} {last}",
                "aliases": json.dumps(aliases),
                "date_of_birth": (datetime.datetime(1980, 1, 1) - datetime.timedelta(days=age*365)).strftime("%Y-%m-%d"),
                "age": age,
                "gender": gender,
                "national_id_synthetic": f"SYN-NAT-{first[:2].upper()}{random.randint(100000, 999999)}",
                "occupation": occ,
                "description": f"Synthetic intelligence profile for {first} {last} ({', '.join(aliases)}).",
                "physical_characteristics": json.dumps({
                    "height_cm": random.randint(165, 192),
                    "build": "athletic" if age < 40 else "stocky",
                    "tattoos": ["dragon_forearm", "cross_neck"] if risk in ("high", "extreme") else []
                }),
                "phone_numbers": json.dumps([phone]),
                "email_addresses": json.dumps([f"{first.lower()}.{last.lower()}@synthetic-mail.net"]),
                "addresses": json.dumps([f"{random.randint(10, 800)} {random.choice(STREET_NAMES)}, Metropolis Central"]),
                "risk_level": risk,
                "risk_indicators": json.dumps(indicators),
                "notes": f"Primary subject flagged in CrimeMind synthetic intelligence core. Associated with criminal cluster.",
                "metadata": json.dumps({"scenario_anchor": True, "intelligence_verified": True}),
                "created_at": self._random_dt(self.start_dt, datetime.datetime(2022, 1, 1)).isoformat(),
                "updated_at": self._random_dt(datetime.datetime(2024, 1, 1), self.end_dt).isoformat()
            })

        # Generate Remaining Synthetic Persons
        existing_count = len(self.persons)
        for i in range(existing_count, self.counts["persons"]):
            pid = str(uuid.uuid4())
            gender = random.choice(["male", "female", "non-binary"])
            if gender == "male":
                first = random.choice(FIRST_NAMES_MALE)
            elif gender == "female":
                first = random.choice(FIRST_NAMES_FEMALE)
            else:
                first = random.choice(FIRST_NAMES_MALE + FIRST_NAMES_FEMALE)
            last = random.choice(LAST_NAMES)
            age = random.randint(18, 76)
            occ = random.choice(OCCUPATIONS)
            risk = random.choices(["low", "moderate", "high", "extreme"], weights=[0.75, 0.17, 0.06, 0.02])[0]
            aliases = [random.choice(CRIMINAL_ALIASES)] if risk in ("high", "extreme") and random.random() < 0.6 else []
            indicators = []
            if risk in ("high", "extreme"):
                indicators = random.sample([
                    "prior_theft_record", "association_with_felons", "narcotics_marker",
                    "unexplained_wealth", "burner_phone_turnover", "counter_surveillance_detected"
                ], k=random.randint(1, 3))

            self.persons.append({
                "person_id": pid,
                "first_name": first,
                "last_name": last,
                "full_name": f"{first} {last}",
                "aliases": json.dumps(aliases),
                "date_of_birth": (datetime.datetime(2024, 1, 1) - datetime.timedelta(days=age*365)).strftime("%Y-%m-%d"),
                "age": age,
                "gender": gender,
                "national_id_synthetic": f"SYN-NAT-{i+100000:07d}",
                "occupation": occ,
                "description": f"Synthetic civilian/subject profile record #{i+1}.",
                "physical_characteristics": json.dumps({
                    "height_cm": random.randint(155, 195),
                    "eye_color": random.choice(["brown", "blue", "hazel", "green"]),
                    "hair_color": random.choice(["black", "brown", "blonde", "gray"])
                }),
                "phone_numbers": json.dumps([self._random_phone()]),
                "email_addresses": json.dumps([f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@synthetic-mail.net"]),
                "addresses": json.dumps([f"{random.randint(10, 999)} {random.choice(STREET_NAMES)}, Metropolis Central"]),
                "risk_level": risk,
                "risk_indicators": json.dumps(indicators),
                "notes": "Generated background demographic entity for intelligence network mapping.",
                "metadata": json.dumps({"fictional_seed": True}),
                "created_at": self._random_dt(self.start_dt, datetime.datetime(2023, 1, 1)).isoformat(),
                "updated_at": self._random_dt(datetime.datetime(2024, 1, 1), self.end_dt).isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 5: Generate Vehicles
    # ------------------------------------------------------------------------
    def generate_vehicles(self):
        print(f"[*] Generating {self.counts['vehicles']} synthetic vehicles...")

        # Scenario 2 Vehicle: Damian Cross's Charger (SYN-7X91)
        s2_vehicle_id = str(uuid.uuid4())
        self.scenario_anchors["s2_vehicle_id"] = s2_vehicle_id
        self.vehicles.append({
            "vehicle_id": s2_vehicle_id,
            "registration_number": "SYN-7X91",
            "vin": "1SYN2DGE8912301X4",
            "vehicle_type": "sedan",
            "make": "Dodge",
            "model": "Charger",
            "year": 2021,
            "color": "Dark Gray",
            "owner_person_id": self.scenario_anchors["s2_damian"],
            "stolen_status": False,
            "notes": "Flagged getaway vehicle: Sighted near multiple robbery incidents across Northshore and Downtown.",
            "metadata": json.dumps({"tinted_windows": True, "modified_exhaust": True, "scenario": "SCENARIO_2"}),
            "created_at": datetime.datetime(2022, 3, 15).isoformat(),
            "updated_at": datetime.datetime(2024, 8, 1).isoformat()
        })

        # Scenario 5 Vehicle: Viktor Orlov's Explorer (SYN-4K82)
        s5_vehicle_id = str(uuid.uuid4())
        self.scenario_anchors["s5_vehicle_id"] = s5_vehicle_id
        self.vehicles.append({
            "vehicle_id": s5_vehicle_id,
            "registration_number": "SYN-4K82",
            "vin": "1SYN1FRD4892019Y9",
            "vehicle_type": "suv",
            "make": "Ford",
            "model": "Explorer",
            "year": 2018,
            "color": "Black",
            "owner_person_id": self.scenario_anchors["s5_viktor"],
            "stolen_status": False,
            "notes": "Registered to Viktor Orlov; previously linked to 2021 logistics heist CASE-2021-0044.",
            "metadata": json.dumps({"cross_case_anchor": True, "scenario": "SCENARIO_5"}),
            "created_at": datetime.datetime(2021, 2, 10).isoformat(),
            "updated_at": datetime.datetime(2024, 7, 20).isoformat()
        })

        # General vehicles
        for i in range(len(self.vehicles), self.counts["vehicles"]):
            vid = str(uuid.uuid4())
            make, model, vtype = random.choice(VEHICLE_MAKES_MODELS)
            color = random.choice(COLORS)
            owner = random.choice(self.persons) if random.random() < 0.85 else None
            stolen = random.random() < 0.04

            self.vehicles.append({
                "vehicle_id": vid,
                "registration_number": self._random_plate(),
                "vin": self._random_vin(),
                "vehicle_type": vtype,
                "make": make,
                "model": model,
                "year": random.randint(2010, 2024),
                "color": color,
                "owner_person_id": owner["person_id"] if owner else None,
                "stolen_status": stolen,
                "notes": "Stolen vehicle report active." if stolen else "Synthetic registration record.",
                "metadata": json.dumps({"fuel_type": "gasoline" if i % 4 != 0 else "hybrid"}),
                "created_at": self._random_dt(self.start_dt, datetime.datetime(2023, 1, 1)).isoformat(),
                "updated_at": self._random_dt(datetime.datetime(2024, 1, 1), self.end_dt).isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 6: Generate Cases & Incidents
    # ------------------------------------------------------------------------
    def generate_cases_and_incidents(self):
        print(f"[*] Generating {self.counts['cases']} cases and {self.counts['incidents']} incidents...")

        investigators = [u for u in self.users if u["role"] in ("investigator", "supervisor")]
        analysts = [u for u in self.users if u["role"] == "analyst"]

        # A. Setup Scenario 1: Midnight Syndicate Burglaries (8 Cases)
        s1_case_ids = []
        for b_idx in range(8):
            cid = str(uuid.uuid4())
            s1_case_ids.append(cid)
            year = 2023 if b_idx < 4 else 2024
            case_no = f"CASE-{year}-{100 + b_idx:04d}"
            loc = random.choice([l for l in self.locations if l["area"] in ("Northshore Heights", "Eastside Arts Corridor")])
            officer = random.choice(investigators)
            opened = datetime.datetime(year, (b_idx % 12) + 1, random.randint(1, 25))

            self.cases.append({
                "case_id": cid,
                "case_number": case_no,
                "title": f"Operation Midnight Run: Estate Burglary {b_idx + 1}",
                "description": "High-value residential burglary exhibiting distinct MO: cut fiber security alarms, side entrance forced entry, targeted high-end jewelry and bearer bonds.",
                "status": "under_investigation" if b_idx >= 6 else "closed",
                "priority": "high",
                "crime_type": "Aggravated Burglary",
                "investigating_officer_id": officer["user_id"],
                "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
                "primary_location_id": loc["location_id"],
                "opened_at": opened.isoformat(),
                "closed_at": (opened + datetime.timedelta(days=45)).isoformat() if b_idx < 6 else None,
                "metadata": json.dumps({"scenario": "SCENARIO_1_BURGLARY_NETWORK", "syndicate": "Midnight Syndicate"}),
                "created_at": opened.isoformat(),
                "updated_at": (opened + datetime.timedelta(days=2)).isoformat()
            })

            # Create incident for this burglary
            inc_id = str(uuid.uuid4())
            self.incidents.append({
                "incident_id": inc_id,
                "case_id": cid,
                "incident_number": f"INC-{year}-{100 + b_idx:04d}",
                "crime_type": "Aggravated Burglary",
                "severity": "severe",
                "status": "under_investigation",
                "occurred_at": opened.isoformat(),
                "reported_at": (opened + datetime.timedelta(hours=6)).isoformat(),
                "location_id": loc["location_id"],
                "description": f"Break-in occurred at luxury estate. Vault breached with heavy power tools. Estimated loss $180,000.",
                "modus_operandi": "Alarm fiber optic severed; side window forced; thermal camera evaded; jewelry fence network destination.",
                "estimated_loss_amount": 180000.00,
                "metadata": json.dumps({"syndicate_signature": "Midnight_Viper"}),
                "created_at": opened.isoformat(),
                "updated_at": opened.isoformat()
            })

        self.scenario_anchors["s1_cases"] = s1_case_ids

        # B. Setup Scenario 2: 4 Cases involving Damian Cross's Charger (SYN-7X91)
        s2_case_ids = []
        for r_idx in range(4):
            cid = str(uuid.uuid4())
            s2_case_ids.append(cid)
            case_no = f"CASE-2024-{1100 + r_idx * 150:04d}"
            loc = self.locations[r_idx * 5 % len(self.locations)]
            officer = random.choice(investigators)
            opened = datetime.datetime(2024, 2 + (r_idx * 2), 10, 21, 30)

            self.cases.append({
                "case_id": cid,
                "case_number": case_no,
                "title": f"Armed Commercial Robbery - Series Apex #{r_idx + 1}",
                "description": "Rapid armed robbery of retail/commercial establishment. Witnesses noted a Dark Gray late-model Dodge Charger departing at high speed.",
                "status": "under_investigation",
                "priority": "critical",
                "crime_type": "Commercial Robbery",
                "investigating_officer_id": officer["user_id"],
                "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
                "primary_location_id": loc["location_id"],
                "opened_at": opened.isoformat(),
                "closed_at": None,
                "metadata": json.dumps({"scenario": "SCENARIO_2_VEHICLE_NEAR_INCIDENTS", "getaway_vehicle": "SYN-7X91"}),
                "created_at": opened.isoformat(),
                "updated_at": opened.isoformat()
            })

            # Incidents for Scenario 2
            inc_id = str(uuid.uuid4())
            self.incidents.append({
                "incident_id": inc_id,
                "case_id": cid,
                "incident_number": f"INC-2024-{1100 + r_idx * 150:04d}",
                "crime_type": "Commercial Robbery",
                "severity": "critical",
                "status": "verified",
                "occurred_at": opened.isoformat(),
                "reported_at": (opened + datetime.timedelta(minutes=15)).isoformat(),
                "location_id": loc["location_id"],
                "description": f"Robbery at commercial storefront. Perpetrators fled in a dark sedan.",
                "modus_operandi": "Rapid 3-minute breach; getaway driver idling in alleyway.",
                "estimated_loss_amount": 45000.00,
                "metadata": json.dumps({"vehicle_plate_sighting": "SYN-7X91"}),
                "created_at": opened.isoformat(),
                "updated_at": opened.isoformat()
            })

        self.scenario_anchors["s2_cases"] = s2_case_ids

        # C. Setup Scenario 4 Case: Bank Vault Breach CASE-2024-0771
        s4_case_id = str(uuid.uuid4())
        self.scenario_anchors["s4_case"] = s4_case_id
        s4_loc = random.choice([l for l in self.locations if l["location_type"] == "atm_bank"])
        self.scenario_anchors["s4_loc"] = s4_loc
        s4_opened = datetime.datetime(2024, 5, 14, 2, 45)

        self.cases.append({
            "case_id": s4_case_id,
            "case_number": "CASE-2024-0771",
            "title": "First National Vault Infiltration & Drill Incident",
            "description": "Attempted night-time vault penetration following pre-funded electronic equipment procurement and illicit surveillance.",
            "status": "under_investigation",
            "priority": "critical",
            "crime_type": "Armed Bank Robbery",
            "investigating_officer_id": random.choice(investigators)["user_id"],
            "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
            "primary_location_id": s4_loc["location_id"],
            "opened_at": s4_opened.isoformat(),
            "closed_at": None,
            "metadata": json.dumps({"scenario": "SCENARIO_4_FINANCIAL_TO_PHYSICAL_CRIME"}),
            "created_at": s4_opened.isoformat(),
            "updated_at": s4_opened.isoformat()
        })

        self.incidents.append({
            "incident_id": str(uuid.uuid4()),
            "case_id": s4_case_id,
            "incident_number": "INC-2024-0771",
            "crime_type": "Armed Bank Robbery",
            "severity": "critical",
            "status": "under_investigation",
            "occurred_at": s4_opened.isoformat(),
            "reported_at": (s4_opened + datetime.timedelta(minutes=8)).isoformat(),
            "location_id": s4_loc["location_id"],
            "description": "Silent alarm tripped at First National branch vault. Core drilling equipment left on scene.",
            "modus_operandi": "Concrete core drilling, electronic lock bypass.",
            "estimated_loss_amount": 12000.00,
            "metadata": json.dumps({"target": "safety_deposit_vault"}),
            "created_at": s4_opened.isoformat(),
            "updated_at": s4_opened.isoformat()
        })

        # D. Setup Scenario 5 Cases: Historical 2021 CASE-2021-0044 & Active 2024 CASE-2024-2390
        s5_case_hist = str(uuid.uuid4())
        s5_case_active = str(uuid.uuid4())
        self.scenario_anchors["s5_case_hist"] = s5_case_hist
        self.scenario_anchors["s5_case_active"] = s5_case_active

        self.cases.append({
            "case_id": s5_case_hist,
            "case_number": "CASE-2021-0044",
            "title": "Operation Ironclad: Harbor Logistics Freight Hijacking",
            "description": "Historical investigation resulting in conviction of Viktor Orlov and associates for syndicated freight diversion.",
            "status": "closed",
            "priority": "high",
            "crime_type": "Organized Cargo Theft",
            "investigating_officer_id": random.choice(investigators)["user_id"],
            "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
            "primary_location_id": self.locations[0]["location_id"],
            "opened_at": datetime.datetime(2021, 3, 10).isoformat(),
            "closed_at": datetime.datetime(2021, 11, 20).isoformat(),
            "metadata": json.dumps({"scenario": "SCENARIO_5_HISTORICAL", "conviction": "Viktor Orlov"}),
            "created_at": datetime.datetime(2021, 3, 10).isoformat(),
            "updated_at": datetime.datetime(2021, 11, 20).isoformat()
        })

        self.cases.append({
            "case_id": s5_case_active,
            "case_number": "CASE-2024-2390",
            "title": "Waterfront Terminal 4 Container Breach",
            "description": "Recent container terminal infiltration exhibiting identical freight redirection signatures to 2021 Ironclad case.",
            "status": "under_investigation",
            "priority": "high",
            "crime_type": "Organized Cargo Theft",
            "investigating_officer_id": random.choice(investigators)["user_id"],
            "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
            "primary_location_id": self.locations[0]["location_id"],
            "opened_at": datetime.datetime(2024, 7, 18).isoformat(),
            "closed_at": None,
            "metadata": json.dumps({"scenario": "SCENARIO_5_ACTIVE", "resurfaced_suspect": "Viktor Orlov"}),
            "created_at": datetime.datetime(2024, 7, 18).isoformat(),
            "updated_at": datetime.datetime(2024, 7, 25).isoformat()
        })

        # Remaining General Cases
        statuses = ["open", "under_investigation", "pending_forensics", "closed", "cold_case"]
        priorities = ["critical", "high", "medium", "low"]

        for i in range(len(self.cases), self.counts["cases"]):
            cid = str(uuid.uuid4())
            year = random.choice([2021, 2022, 2023, 2024])
            cno = f"CASE-{year}-{i+1000:04d}"
            ctype = random.choice(CRIME_TYPES)
            loc = random.choice(self.locations)
            officer = random.choice(investigators)
            status = random.choice(statuses) if year < 2024 else random.choice(["open", "under_investigation", "pending_forensics"])
            opened = self._random_dt(datetime.datetime(year, 1, 1), datetime.datetime(year, 12, 28))
            closed = (opened + datetime.timedelta(days=random.randint(10, 180))) if status == "closed" else None

            self.cases.append({
                "case_id": cid,
                "case_number": cno,
                "title": f"Investigation into {ctype} at {loc['area']}",
                "description": f"Dossier opened regarding suspected {ctype.lower()} occurring within {loc['name']}. Multiple leads under review.",
                "status": status,
                "priority": random.choice(priorities),
                "crime_type": ctype,
                "investigating_officer_id": officer["user_id"],
                "lead_analyst_id": random.choice(analysts)["user_id"] if analysts else None,
                "primary_location_id": loc["location_id"],
                "opened_at": opened.isoformat(),
                "closed_at": closed.isoformat() if closed else None,
                "metadata": json.dumps({"tags": [ctype.lower().replace(" ", "_"), loc['area'].lower().replace(" ", "_")]}),
                "created_at": opened.isoformat(),
                "updated_at": (closed if closed else opened).isoformat()
            })

        # Generate Remaining Incidents
        for i in range(len(self.incidents), self.counts["incidents"]):
            iid = str(uuid.uuid4())
            parent_case = random.choice(self.cases)
            loc = random.choice(self.locations)
            ctype = parent_case["crime_type"]
            occ = datetime.datetime.fromisoformat(parent_case["opened_at"]) - datetime.timedelta(hours=random.randint(1, 48))

            self.incidents.append({
                "incident_id": iid,
                "case_id": parent_case["case_id"],
                "incident_number": f"INC-{datetime.datetime.fromisoformat(parent_case['opened_at']).year}-{i+1000:04d}",
                "crime_type": ctype,
                "severity": random.choice(["critical", "severe", "moderate", "minor"]),
                "status": random.choice(["reported", "verified", "under_investigation", "cleared"]),
                "occurred_at": occ.isoformat(),
                "reported_at": (occ + datetime.timedelta(minutes=random.randint(15, 300))).isoformat(),
                "location_id": loc["location_id"],
                "description": f"Incident of {ctype} reported at {loc['address']}.",
                "modus_operandi": "Standard operational patterns observed.",
                "estimated_loss_amount": round(random.uniform(500.0, 75000.0), 2),
                "metadata": json.dumps({"weather": random.choice(["clear", "rain", "fog", "cloudy"])}),
                "created_at": occ.isoformat(),
                "updated_at": occ.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 7: Link Case Persons (Junction)
    # ------------------------------------------------------------------------
    def generate_case_persons(self):
        print(f"[*] Linking persons to cases with roles (suspect, victim, witness, POI)...")

        # Explicit Scenario Links
        # S1: Midnight Syndicate linked to 8 Burglary cases
        for cid in self.scenario_anchors["s1_cases"]:
            self.case_persons.append({
                "case_person_id": str(uuid.uuid4()),
                "case_id": cid,
                "person_id": self.scenario_anchors["s1_viper"],
                "relationship_type": "suspect",
                "involvement_summary": "Identified as primary fencing coordinator and intellectual author of burglary string.",
                "is_primary": True,
                "added_at": datetime.datetime(2023, 6, 1).isoformat(),
                "added_by": self.cases[0]["investigating_officer_id"]
            })
            self.case_persons.append({
                "case_person_id": str(uuid.uuid4()),
                "case_id": cid,
                "person_id": self.scenario_anchors["s1_ghost"],
                "relationship_type": "suspect",
                "involvement_summary": "Physical locksmith specialist implicated in bypassing commercial grade deadbolts.",
                "is_primary": False,
                "added_at": datetime.datetime(2023, 6, 1).isoformat(),
                "added_by": self.cases[0]["investigating_officer_id"]
            })
            for crew_id in self.scenario_anchors["s1_crew"]:
                self.case_persons.append({
                    "case_person_id": str(uuid.uuid4()),
                    "case_id": cid,
                    "person_id": crew_id,
                    "relationship_type": "associate",
                    "involvement_summary": "Observed in perimeter surveillance near burglary timeline.",
                    "is_primary": False,
                    "added_at": datetime.datetime(2023, 6, 2).isoformat(),
                    "added_by": self.cases[0]["investigating_officer_id"]
                })

        # S2: Damian Cross in 4 robbery cases
        for cid in self.scenario_anchors["s2_cases"]:
            self.case_persons.append({
                "case_person_id": str(uuid.uuid4()),
                "case_id": cid,
                "person_id": self.scenario_anchors["s2_damian"],
                "relationship_type": "suspect",
                "involvement_summary": "Registered owner of getaway Dodge Charger SYN-7X91 identified departing crime scene.",
                "is_primary": True,
                "added_at": datetime.datetime(2024, 3, 1).isoformat(),
                "added_by": self.cases[0]["investigating_officer_id"]
            })

        # S4: Trevor Bennett in Bank Case CASE-2024-0771
        self.case_persons.append({
            "case_person_id": str(uuid.uuid4()),
            "case_id": self.scenario_anchors["s4_case"],
            "person_id": self.scenario_anchors["s4_trevor"],
            "relationship_type": "suspect",
            "involvement_summary": "Subject of electronic wire transfer, confirmed near bank vault entry during alarm trigger.",
            "is_primary": True,
            "added_at": datetime.datetime(2024, 5, 15).isoformat(),
            "added_by": self.cases[0]["investigating_officer_id"]
        })

        # S5: Viktor Orlov in Historical and Active Case
        self.case_persons.append({
            "case_person_id": str(uuid.uuid4()),
            "case_id": self.scenario_anchors["s5_case_hist"],
            "person_id": self.scenario_anchors["s5_viktor"],
            "relationship_type": "suspect",
            "involvement_summary": "Arrested and convicted for 2021 Freight Hijacking ringleader role.",
            "is_primary": True,
            "added_at": datetime.datetime(2021, 3, 15).isoformat(),
            "added_by": self.cases[0]["investigating_officer_id"]
        })
        self.case_persons.append({
            "case_person_id": str(uuid.uuid4()),
            "case_id": self.scenario_anchors["s5_case_active"],
            "person_id": self.scenario_anchors["s5_viktor"],
            "relationship_type": "person_of_interest",
            "involvement_summary": "Resurfaced on camera at Terminal 4 48 hours prior to cargo breach.",
            "is_primary": True,
            "added_at": datetime.datetime(2024, 7, 20).isoformat(),
            "added_by": self.cases[0]["investigating_officer_id"]
        })

        # General Case-Person Distribution
        roles = ["suspect", "victim", "witness", "person_of_interest", "complainant", "informant"]
        weights = [0.25, 0.35, 0.25, 0.10, 0.03, 0.02]

        used_pairs = set((cp["case_id"], cp["person_id"]) for cp in self.case_persons)

        for case in self.cases:
            # Add 2 to 6 persons per case
            needed = random.randint(2, 6)
            for _ in range(needed):
                person = random.choice(self.persons)
                pair = (case["case_id"], person["person_id"])
                if pair in used_pairs:
                    continue
                used_pairs.add(pair)
                role = random.choices(roles, weights=weights)[0]

                self.case_persons.append({
                    "case_person_id": str(uuid.uuid4()),
                    "case_id": case["case_id"],
                    "person_id": person["person_id"],
                    "relationship_type": role,
                    "involvement_summary": f"Interviewed or catalogued in relation to {case['crime_type'].lower()} investigation.",
                    "is_primary": (role == "suspect" and random.random() < 0.5),
                    "added_at": case["opened_at"],
                    "added_by": case["investigating_officer_id"]
                })

                if len(self.case_persons) >= self.counts["case_persons"]:
                    break
            if len(self.case_persons) >= self.counts["case_persons"]:
                break

    # ------------------------------------------------------------------------
    # STEP 8: Generate Evidence Records
    # ------------------------------------------------------------------------
    def generate_evidence(self):
        print(f"[*] Generating {self.counts['evidence']} evidence items...")

        for i in range(self.counts["evidence"]):
            eid = str(uuid.uuid4())
            case = random.choice(self.cases)
            etype = random.choice(EVIDENCE_TYPES)
            cno = case["case_number"]
            num = f"EVD-{cno[-9:]}-{i+1:05d}"
            c_at = self._random_dt(datetime.datetime.fromisoformat(case["opened_at"]), self.end_dt)

            self.evidence.append({
                "evidence_id": eid,
                "case_id": case["case_id"],
                "incident_id": None,
                "evidence_number": num,
                "evidence_type": etype,
                "title": f"{etype.replace('_', ' ').title()} Artifact {i+1} for {cno}",
                "description": f"Forensic item secured in connection with {case['title']}.",
                "source": random.choice(["Crime Scene Unit", "Subpoenaed Records", "Digital Forensics Lab", "Field Sighting", "Impound Vault"]),
                "collected_at": c_at.isoformat(),
                "collected_by": case["investigating_officer_id"],
                "file_path": f"s3://crimemind-evidence-vault/cases/{cno}/{num.lower()}.dat",
                "hash": self._random_hash(f"evd-{i}"),
                "metadata": json.dumps({"file_size_bytes": random.randint(1024, 104857600), "mime_type": "application/octet-stream"}),
                "chain_of_custody": json.dumps([
                    {"action": "collected", "officer_id": case["investigating_officer_id"], "timestamp": c_at.isoformat(), "facility": "Central Vault"},
                    {"action": "lab_analysis", "analyst_id": case["lead_analyst_id"], "timestamp": (c_at + datetime.timedelta(days=2)).isoformat(), "facility": "Forensics Lab"}
                ]),
                "created_at": c_at.isoformat(),
                "updated_at": c_at.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 9: Generate Graph Relationships
    # ------------------------------------------------------------------------
    def generate_relationships(self):
        print(f"[*] Generating {self.counts['relationships']} graph relationships...")

        rel_types = [
            "COMMUNICATED_WITH", "TRANSFERRED_FUNDS_TO", "OWNS_VEHICLE",
            "OPERATED_VEHICLE", "ASSOCIATE_OF", "KNOWS", "FAMILY_MEMBER",
            "DETECTED_NEAR", "LINKED_TO_EVIDENCE", "SUSPECT_IN", "PRESENT_AT"
        ]

        # Explicit Scenario 1 relationships:
        s1_edges = [
            (self.scenario_anchors["s1_viper"], self.scenario_anchors["s1_ghost"], "ASSOCIATE_OF", 0.98),
            (self.scenario_anchors["s1_ghost"], self.scenario_anchors["s1_crew"][0], "ASSOCIATE_OF", 0.95),
            (self.scenario_anchors["s1_ghost"], self.scenario_anchors["s1_crew"][1], "ASSOCIATE_OF", 0.95),
            (self.scenario_anchors["s1_ghost"], self.scenario_anchors["s1_crew"][2], "ASSOCIATE_OF", 0.95),
            (self.scenario_anchors["s1_crew"][0], self.scenario_anchors["s1_viper"], "COMMUNICATED_WITH", 0.92)
        ]
        for src, tgt, rtype, conf in s1_edges:
            self.relationships.append({
                "relationship_id": str(uuid.uuid4()),
                "source_entity_type": "PERSON",
                "source_entity_id": src,
                "target_entity_type": "PERSON",
                "target_entity_id": tgt,
                "relationship_type": rtype,
                "confidence": conf,
                "source_evidence_id": None,
                "properties": json.dumps({"scenario": "SCENARIO_1_BURGLARY_NETWORK"}),
                "created_at": self.start_dt.isoformat(),
                "updated_at": self.start_dt.isoformat()
            })

        # Explicit Scenario 3 relationships: Evelyn Reed communicating with multiple suspects
        suspects_for_evelyn = [
            self.scenario_anchors["s1_viper"],
            self.scenario_anchors["s2_damian"],
            self.scenario_anchors["s4_trevor"],
            self.scenario_anchors["s5_viktor"],
            self.scenario_anchors["s1_ghost"],
            self.scenario_anchors["s1_crew"][0],
            self.scenario_anchors["s1_crew"][1]
        ]
        for s_idx, s_id in enumerate(suspects_for_evelyn):
            self.relationships.append({
                "relationship_id": str(uuid.uuid4()),
                "source_entity_type": "PERSON",
                "source_entity_id": self.scenario_anchors["s3_evelyn"],
                "target_entity_type": "PERSON",
                "target_entity_id": s_id,
                "relationship_type": "COMMUNICATED_WITH",
                "confidence": 0.9600,
                "source_evidence_id": None,
                "properties": json.dumps({"broker_nexus": True, "suspect_rank": s_idx + 1}),
                "created_at": datetime.datetime(2024, 1, 15).isoformat(),
                "updated_at": datetime.datetime(2024, 1, 15).isoformat()
            })

        # Scenario 2 Vehicle Ownership
        self.relationships.append({
            "relationship_id": str(uuid.uuid4()),
            "source_entity_type": "PERSON",
            "source_entity_id": self.scenario_anchors["s2_damian"],
            "target_entity_type": "VEHICLE",
            "target_entity_id": self.scenario_anchors["s2_vehicle_id"],
            "relationship_type": "OWNS_VEHICLE",
            "confidence": 1.0000,
            "source_evidence_id": None,
            "properties": json.dumps({"plate": "SYN-7X91"}),
            "created_at": datetime.datetime(2022, 3, 15).isoformat(),
            "updated_at": datetime.datetime(2022, 3, 15).isoformat()
        })

        # Populate General Multi-Type Relationships
        used_edges = set((r["source_entity_id"], r["target_entity_id"], r["relationship_type"]) for r in self.relationships)

        while len(self.relationships) < self.counts["relationships"]:
            mode = random.choices(["P_TO_P", "P_TO_CASE", "P_TO_VEHICLE", "P_TO_LOC", "P_TO_EVD"], weights=[0.45, 0.20, 0.15, 0.10, 0.10])[0]

            if mode == "P_TO_P":
                p1 = random.choice(self.persons)
                p2 = random.choice(self.persons)
                if p1["person_id"] == p2["person_id"]:
                    continue
                rtype = random.choice(["COMMUNICATED_WITH", "ASSOCIATE_OF", "KNOWS", "TRANSFERRED_FUNDS_TO", "FAMILY_MEMBER"])
                edge = (p1["person_id"], p2["person_id"], rtype)
                if edge in used_edges:
                    continue
                used_edges.add(edge)
                self.relationships.append({
                    "relationship_id": str(uuid.uuid4()),
                    "source_entity_type": "PERSON",
                    "source_entity_id": p1["person_id"],
                    "target_entity_type": "PERSON",
                    "target_entity_id": p2["person_id"],
                    "relationship_type": rtype,
                    "confidence": round(random.uniform(0.65, 0.99), 4),
                    "source_evidence_id": random.choice(self.evidence)["evidence_id"] if random.random() < 0.2 else None,
                    "properties": json.dumps({"weight": random.randint(1, 10)}),
                    "created_at": self._random_dt().isoformat(),
                    "updated_at": self.end_dt.isoformat()
                })

            elif mode == "P_TO_CASE":
                p = random.choice(self.persons)
                c = random.choice(self.cases)
                rtype = "SUSPECT_IN" if p["risk_level"] in ("high", "extreme") else "WITNESS_IN"
                edge = (p["person_id"], c["case_id"], rtype)
                if edge in used_edges:
                    continue
                used_edges.add(edge)
                self.relationships.append({
                    "relationship_id": str(uuid.uuid4()),
                    "source_entity_type": "PERSON",
                    "source_entity_id": p["person_id"],
                    "target_entity_type": "CASE",
                    "target_entity_id": c["case_id"],
                    "relationship_type": rtype,
                    "confidence": 0.9500,
                    "source_evidence_id": None,
                    "properties": json.dumps({}),
                    "created_at": c["opened_at"],
                    "updated_at": c["opened_at"]
                })

            elif mode == "P_TO_VEHICLE":
                p = random.choice(self.persons)
                v = random.choice(self.vehicles)
                edge = (p["person_id"], v["vehicle_id"], "OPERATED_VEHICLE")
                if edge in used_edges:
                    continue
                used_edges.add(edge)
                self.relationships.append({
                    "relationship_id": str(uuid.uuid4()),
                    "source_entity_type": "PERSON",
                    "source_entity_id": p["person_id"],
                    "target_entity_type": "VEHICLE",
                    "target_entity_id": v["vehicle_id"],
                    "relationship_type": "OPERATED_VEHICLE",
                    "confidence": 0.8800,
                    "source_evidence_id": None,
                    "properties": json.dumps({"plate": v["registration_number"]}),
                    "created_at": self._random_dt().isoformat(),
                    "updated_at": self.end_dt.isoformat()
                })

            elif mode == "P_TO_LOC":
                p = random.choice(self.persons)
                l = random.choice(self.locations)
                edge = (p["person_id"], l["location_id"], "PRESENT_AT")
                if edge in used_edges:
                    continue
                used_edges.add(edge)
                self.relationships.append({
                    "relationship_id": str(uuid.uuid4()),
                    "source_entity_type": "PERSON",
                    "source_entity_id": p["person_id"],
                    "target_entity_type": "LOCATION",
                    "target_entity_id": l["location_id"],
                    "relationship_type": "PRESENT_AT",
                    "confidence": 0.9000,
                    "source_evidence_id": None,
                    "properties": json.dumps({"location_type": l["location_type"]}),
                    "created_at": self._random_dt().isoformat(),
                    "updated_at": self.end_dt.isoformat()
                })

            else: # P_TO_EVD
                p = random.choice(self.persons)
                ev = random.choice(self.evidence)
                edge = (p["person_id"], ev["evidence_id"], "LINKED_TO_EVIDENCE")
                if edge in used_edges:
                    continue
                used_edges.add(edge)
                self.relationships.append({
                    "relationship_id": str(uuid.uuid4()),
                    "source_entity_type": "PERSON",
                    "source_entity_id": p["person_id"],
                    "target_entity_type": "EVIDENCE",
                    "target_entity_id": ev["evidence_id"],
                    "relationship_type": "LINKED_TO_EVIDENCE",
                    "confidence": 0.9200,
                    "source_evidence_id": ev["evidence_id"],
                    "properties": json.dumps({"evidence_type": ev["evidence_type"]}),
                    "created_at": ev["collected_at"],
                    "updated_at": ev["collected_at"]
                })

    # ------------------------------------------------------------------------
    # STEP 10: Generate Call Records
    # ------------------------------------------------------------------------
    def generate_call_records(self):
        print(f"[*] Generating {self.counts['call_records']} Call Detail Records (CDRs)...")

        # Scenario 3: Evelyn Reed calling each of the 7 prime suspects
        evelyn_phone = "+1-555-019-4821"
        suspects_for_evelyn = [
            self.scenario_anchors["s1_viper"],
            self.scenario_anchors["s2_damian"],
            self.scenario_anchors["s4_trevor"],
            self.scenario_anchors["s5_viktor"],
            self.scenario_anchors["s1_ghost"],
            self.scenario_anchors["s1_crew"][0],
            self.scenario_anchors["s1_crew"][1]
        ]

        for s_id in suspects_for_evelyn:
            target_person = next(p for p in self.persons if p["person_id"] == s_id)
            target_phone = json.loads(target_person["phone_numbers"])[0]

            # Generate 4-8 encrypted calls in tight time windows
            for call_i in range(random.randint(4, 8)):
                c_time = datetime.datetime(2024, 4, 10 + call_i, random.randint(18, 23), random.randint(0, 59))
                self.call_records.append({
                    "call_id": str(uuid.uuid4()),
                    "caller_phone": evelyn_phone,
                    "caller_person_id": self.scenario_anchors["s3_evelyn"],
                    "receiver_phone": target_phone,
                    "receiver_person_id": s_id,
                    "call_timestamp": c_time.isoformat(),
                    "duration_seconds": random.randint(30, 240),
                    "call_type": "encrypted_voip",
                    "originating_location_id": self.locations[1]["location_id"],
                    "destination_location_id": self.locations[2]["location_id"],
                    "tower_metadata": json.dumps({"cell_tower_id": "TOW-DT-882", "imsi": f"310410{random.randint(100000000, 999999999)}"}),
                    "created_at": c_time.isoformat()
                })

        # Remaining General Calls
        call_types = ["voice", "voice", "sms", "encrypted_voip", "missed"]
        for _ in range(len(self.call_records), self.counts["call_records"]):
            p1 = random.choice(self.persons)
            p2 = random.choice(self.persons)
            phone1 = json.loads(p1["phone_numbers"])[0] if p1["phone_numbers"] else self._random_phone()
            phone2 = json.loads(p2["phone_numbers"])[0] if p2["phone_numbers"] else self._random_phone()
            loc1 = random.choice(self.locations)
            loc2 = random.choice(self.locations)
            t_call = self._random_dt()
            ctype = random.choice(call_types)
            dur = 0 if ctype in ("sms", "missed") else random.randint(10, 1800)

            self.call_records.append({
                "call_id": str(uuid.uuid4()),
                "caller_phone": phone1,
                "caller_person_id": p1["person_id"],
                "receiver_phone": phone2,
                "receiver_person_id": p2["person_id"],
                "call_timestamp": t_call.isoformat(),
                "duration_seconds": dur,
                "call_type": ctype,
                "originating_location_id": loc1["location_id"],
                "destination_location_id": loc2["location_id"],
                "tower_metadata": json.dumps({
                    "cell_tower_id": f"TOW-{loc1['area'][:3].upper()}-{random.randint(100, 999)}",
                    "azimuth": random.randint(0, 359),
                    "signal_dbm": random.randint(-95, -55)
                }),
                "created_at": t_call.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 11: Generate Transactions
    # ------------------------------------------------------------------------
    def generate_transactions(self):
        print(f"[*] Generating {self.counts['transactions']} financial transactions...")

        # Scenario 4: Trevor Bennett receives $25,000 wire transfer 3 hours before bank heist
        s4_time = datetime.datetime(2024, 5, 13, 23, 15) # 3.5 hours before 02:45 AM heist
        self.transactions.append({
            "transaction_id": str(uuid.uuid4()),
            "sender_person_id": self.scenario_anchors["s3_evelyn"], # Evelyn Reed acts as sponsor
            "receiver_person_id": self.scenario_anchors["s4_trevor"],
            "sender_account": "ACT-OFFSHORE-99120",
            "receiver_account": "ACT-TREVOR-33019",
            "amount": 25000.00,
            "currency": "USD",
            "transaction_timestamp": s4_time.isoformat(),
            "transaction_type": "wire_transfer",
            "merchant": "Global Trade Escrow LLC",
            "location_id": self.scenario_anchors["s4_loc"]["location_id"],
            "is_flagged_suspicious": True,
            "metadata": json.dumps({"scenario": "SCENARIO_4_FINANCIAL_TO_PHYSICAL_CRIME", "flag": "large_cash_equivalent"}),
            "created_at": s4_time.isoformat()
        })

        # Remaining Transactions
        tx_types = ["wire_transfer", "pos_purchase", "atm_withdrawal", "p2p_transfer", "crypto_synthetic", "cash_deposit"]
        merchants = ["Apex Electronics", "Harbor Fuel & Oil", "Metro Supermarket", "Grand Central Jewelry", "Pawn King", "FastCash ATM"]

        for _ in range(len(self.transactions), self.counts["transactions"]):
            p1 = random.choice(self.persons)
            p2 = random.choice(self.persons)
            loc = random.choice(self.locations)
            ttype = random.choice(tx_types)
            is_suspicious = (ttype in ("crypto_synthetic", "wire_transfer") and random.random() < 0.15)
            amt = round(random.uniform(5000.0, 85000.0) if is_suspicious else random.uniform(8.50, 2400.0), 2)
            t_tx = self._random_dt()

            self.transactions.append({
                "transaction_id": str(uuid.uuid4()),
                "sender_person_id": p1["person_id"],
                "receiver_person_id": p2["person_id"] if ttype in ("p2p_transfer", "wire_transfer") else None,
                "sender_account": f"ACT-SYN-{random.randint(100000, 999999)}",
                "receiver_account": f"ACT-SYN-{random.randint(100000, 999999)}",
                "amount": amt,
                "currency": "USD",
                "transaction_timestamp": t_tx.isoformat(),
                "transaction_type": ttype,
                "merchant": random.choice(merchants) if ttype in ("pos_purchase", "atm_withdrawal") else None,
                "location_id": loc["location_id"],
                "is_flagged_suspicious": is_suspicious,
                "metadata": json.dumps({"terminal_id": f"TERM-{random.randint(1000, 9999)}"}),
                "created_at": t_tx.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 12: Generate CCTV Detections
    # ------------------------------------------------------------------------
    def generate_cctv_detections(self):
        print(f"[*] Generating {self.counts['cctv_detections']} CCTV detections...")

        # Scenario 2 CCTV Detections: Dodge Charger (SYN-7X91) sighted near 4 robbery incidents
        charger_vid = self.scenario_anchors["s2_vehicle_id"]
        for s2_cid in self.scenario_anchors["s2_cases"]:
            case = next(c for c in self.cases if c["case_id"] == s2_cid)
            inc_time = datetime.datetime.fromisoformat(case["opened_at"])
            # Camera near location
            cam = random.choice([c for c in self.cctv_cameras if c["location_id"] == case["primary_location_id"]] or self.cctv_cameras)

            # Detection 20 mins before
            self.cctv_detections.append({
                "detection_id": str(uuid.uuid4()),
                "camera_id": cam["camera_id"],
                "detected_at": (inc_time - datetime.timedelta(minutes=20)).isoformat(),
                "person_id": None,
                "vehicle_id": charger_vid,
                "detected_object": "license_plate",
                "confidence": 0.9650,
                "image_reference": f"/surveillance/captures/{cam['camera_code']}/plate_syn7x91_pre.jpg",
                "video_reference": f"/surveillance/streams/{cam['camera_code']}/clip_pre.mp4",
                "bounding_box": json.dumps({"x": 0.32, "y": 0.45, "width": 0.22, "height": 0.18}),
                "event_metadata": json.dumps({"ocr_plate": "SYN-7X91", "scenario": "SCENARIO_2_VEHICLE_NEAR_INCIDENTS", "speed_kmh": 42}),
                "created_at": inc_time.isoformat()
            })

            # Detection 15 mins after
            self.cctv_detections.append({
                "detection_id": str(uuid.uuid4()),
                "camera_id": cam["camera_id"],
                "detected_at": (inc_time + datetime.timedelta(minutes=15)).isoformat(),
                "person_id": None,
                "vehicle_id": charger_vid,
                "detected_object": "vehicle",
                "confidence": 0.9420,
                "image_reference": f"/surveillance/captures/{cam['camera_code']}/vehicle_syn7x91_post.jpg",
                "video_reference": f"/surveillance/streams/{cam['camera_code']}/clip_post.mp4",
                "bounding_box": json.dumps({"x": 0.15, "y": 0.28, "width": 0.48, "height": 0.35}),
                "event_metadata": json.dumps({"ocr_plate": "SYN-7X91", "scenario": "SCENARIO_2_VEHICLE_NEAR_INCIDENTS", "speed_kmh": 85}),
                "created_at": inc_time.isoformat()
            })

        # Scenario 4: Trevor Bennett captured on camera outside bank vault 45 mins before heist
        s4_cam = random.choice([c for c in self.cctv_cameras if c["location_id"] == self.scenario_anchors["s4_loc"]["location_id"]] or self.cctv_cameras)
        s4_det_time = datetime.datetime(2024, 5, 14, 2, 0)
        self.cctv_detections.append({
            "detection_id": str(uuid.uuid4()),
            "camera_id": s4_cam["camera_id"],
            "detected_at": s4_det_time.isoformat(),
            "person_id": self.scenario_anchors["s4_trevor"],
            "vehicle_id": None,
            "detected_object": "face",
            "confidence": 0.9780,
            "image_reference": f"/surveillance/captures/{s4_cam['camera_code']}/face_trevor_vault.jpg",
            "video_reference": f"/surveillance/streams/{s4_cam['camera_code']}/clip_vault.mp4",
            "bounding_box": json.dumps({"x": 0.41, "y": 0.22, "width": 0.16, "height": 0.21}),
            "event_metadata": json.dumps({"scenario": "SCENARIO_4_FINANCIAL_TO_PHYSICAL_CRIME", "facial_match": "Trevor Bennett"}),
            "created_at": s4_det_time.isoformat()
        })

        # Remaining General CCTV Detections
        objects = ["person", "vehicle", "license_plate", "face", "backpack", "weapon"]
        obj_weights = [0.45, 0.30, 0.12, 0.08, 0.03, 0.02]

        for _ in range(len(self.cctv_detections), self.counts["cctv_detections"]):
            cam = random.choice(self.cctv_cameras)
            obj = random.choices(objects, weights=obj_weights)[0]
            t_det = self._random_dt()
            p_id = random.choice(self.persons)["person_id"] if obj in ("person", "face") else None
            v_id = random.choice(self.vehicles)["vehicle_id"] if obj in ("vehicle", "license_plate") else None

            self.cctv_detections.append({
                "detection_id": str(uuid.uuid4()),
                "camera_id": cam["camera_id"],
                "detected_at": t_det.isoformat(),
                "person_id": p_id,
                "vehicle_id": v_id,
                "detected_object": obj,
                "confidence": round(random.uniform(0.72, 0.99), 4),
                "image_reference": f"/surveillance/captures/{cam['camera_code']}/det_{uuid.uuid4().hex[:8]}.jpg",
                "video_reference": f"/surveillance/streams/{cam['camera_code']}/clip_{uuid.uuid4().hex[:8]}.mp4" if random.random() < 0.3 else None,
                "bounding_box": json.dumps({
                    "x": round(random.uniform(0.05, 0.7), 2),
                    "y": round(random.uniform(0.05, 0.7), 2),
                    "width": round(random.uniform(0.1, 0.3), 2),
                    "height": round(random.uniform(0.1, 0.3), 2)
                }),
                "event_metadata": json.dumps({"lighting": "night_vision" if t_det.hour < 6 or t_det.hour > 20 else "ambient"}),
                "created_at": t_det.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 13: Generate Person Locations (Observations)
    # ------------------------------------------------------------------------
    def generate_person_locations(self):
        print(f"[*] Generating {self.counts['person_locations']} person location observations...")
        sources = ["cctv_detection", "cell_tower_ping", "witness_sighting", "license_plate_reader", "credit_card_swipe"]

        for _ in range(self.counts["person_locations"]):
            p = random.choice(self.persons)
            l = random.choice(self.locations)
            t_obs = self._random_dt()
            src = random.choice(sources)

            self.person_locations.append({
                "observation_id": str(uuid.uuid4()),
                "person_id": p["person_id"],
                "location_id": l["location_id"],
                "observed_at": t_obs.isoformat(),
                "source": src,
                "confidence": round(random.uniform(0.75, 0.99), 4),
                "evidence_id": random.choice(self.evidence)["evidence_id"] if random.random() < 0.25 else None,
                "notes": f"Observation logged via {src} at {l['name']}.",
                "metadata": json.dumps({"source_sensor": src}),
                "created_at": t_obs.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 14: Generate Timeline Events
    # ------------------------------------------------------------------------
    def generate_timeline_events(self):
        print(f"[*] Generating {self.counts['timeline_events']} unified timeline events...")

        event_types = [
            "crime_committed", "cctv_sighting", "phone_call", "financial_transfer",
            "vehicle_sighting", "statement_recorded", "evidence_seized", "agent_inference"
        ]

        for _ in range(self.counts["timeline_events"]):
            c = random.choice(self.cases)
            etype = random.choice(event_types)
            p = random.choice(self.persons)
            l = random.choice(self.locations)
            t_event = self._random_dt(datetime.datetime.fromisoformat(c["opened_at"]), self.end_dt)

            self.timeline_events.append({
                "event_id": str(uuid.uuid4()),
                "case_id": c["case_id"],
                "event_timestamp": t_event.isoformat(),
                "event_type": etype,
                "primary_entity_type": "PERSON",
                "primary_entity_id": p["person_id"],
                "secondary_entity_type": "LOCATION" if etype in ("crime_committed", "cctv_sighting") else "CASE",
                "secondary_entity_id": l["location_id"] if etype in ("crime_committed", "cctv_sighting") else c["case_id"],
                "location_id": l["location_id"],
                "description": f"Timeline event of type '{etype}' observed during investigation of {c['case_number']}.",
                "source": "Automated Event Synthesizer",
                "evidence_id": random.choice(self.evidence)["evidence_id"] if random.random() < 0.2 else None,
                "metadata": json.dumps({"synthesized_event": True}),
                "created_at": t_event.isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 15: Generate Statements, Notes, Agent Runs, AI Findings, Audit Logs
    # ------------------------------------------------------------------------
    def generate_supporting_ai_and_audit(self):
        print(f"[*] Generating Statements ({self.counts['statements']}), Agent Runs ({self.counts['agent_runs']}), AI Findings ({self.counts['ai_findings']}), Notes ({self.counts['investigation_notes']}), Audit Logs ({self.counts['audit_logs']})...")

        # Statements
        statement_sources = ["formal_interrogation", "witness_interview", "informant_tip", "field_inquiry", "written_deposition"]
        for i in range(self.counts["statements"]):
            case = random.choice(self.cases)
            person = random.choice(self.persons)
            src = random.choice(statement_sources)
            t_stmt = self._random_dt(datetime.datetime.fromisoformat(case["opened_at"]), self.end_dt)

            self.statements.append({
                "statement_id": str(uuid.uuid4()),
                "case_id": case["case_id"],
                "person_id": person["person_id"],
                "statement_text": f"Subject stated during {src.replace('_', ' ')} that they were present in {random.choice(DISTRICTS)} and noticed unusual commotion near the rear loading bays.",
                "statement_timestamp": t_stmt.isoformat(),
                "investigator_id": case["investigating_officer_id"],
                "source": src,
                "transcript_metadata": json.dumps({"audio_duration_seconds": random.randint(120, 3600), "language": "en-US", "transcription_confidence": 0.98}),
                "created_at": t_stmt.isoformat(),
                "updated_at": t_stmt.isoformat()
            })

        # Agent Runs (LangGraph Orchestration)
        agents = ["NetworkAnalysisAgent", "TimelineReconstructionAgent", "CrossCaseMatcherAgent", "EvidenceSynthesizerAgent", "GeospatialPatternAgent"]
        for _ in range(self.counts["agent_runs"]):
            case = random.choice(self.cases)
            agent_name = random.choice(agents)
            t_start = self._random_dt(datetime.datetime.fromisoformat(case["opened_at"]), self.end_dt)
            dur = random.randint(1200, 45000)

            self.agent_runs.append({
                "run_id": str(uuid.uuid4()),
                "case_id": case["case_id"],
                "agent_name": agent_name,
                "task": f"Execute deep graph reasoning and correlation for case {case['case_number']}",
                "status": "completed",
                "started_at": t_start.isoformat(),
                "completed_at": (t_start + datetime.timedelta(milliseconds=dur)).isoformat(),
                "duration_ms": dur,
                "input_parameters": json.dumps({"depth": 3, "min_confidence": 0.75, "case_id": case["case_id"]}),
                "output_summary": json.dumps({"anomalies_detected": random.randint(1, 8), "subgraph_nodes_evaluated": random.randint(25, 450)}),
                "confidence": round(random.uniform(0.82, 0.99), 4),
                "errors": None,
                "created_at": t_start.isoformat()
            })

        # AI Findings (Marked clearly as AI generated, never modifying raw evidence)
        finding_types = ["network_anomaly", "cross_case_match", "timeline_inconsistency", "suspect_identification", "movement_pattern", "financial_flow"]
        for _ in range(self.counts["ai_findings"]):
            case = random.choice(self.cases)
            run = random.choice(self.agent_runs) if self.agent_runs else None
            agent = random.choice(agents)
            ftype = random.choice(finding_types)
            verified = random.random() < 0.35
            t_find = self._random_dt(datetime.datetime.fromisoformat(case["opened_at"]), self.end_dt)

            self.ai_findings.append({
                "finding_id": str(uuid.uuid4()),
                "case_id": case["case_id"],
                "agent_run_id": run["run_id"] if run else None,
                "agent_name": agent,
                "finding_type": ftype,
                "title": f"AI Finding: {ftype.replace('_', ' ').title()} in {case['case_number']}",
                "finding_text": f"Agent {agent} identified high-probability {ftype} indicating correlated criminal activity across multiple synthetic indicators.",
                "confidence": round(random.uniform(0.78, 0.99), 4),
                "supporting_evidence_ids": json.dumps([random.choice(self.evidence)["evidence_id"]]),
                "supporting_entity_references": json.dumps([{"type": "PERSON", "id": random.choice(self.persons)["person_id"]}]),
                "human_verified": verified,
                "verified_by": case["investigating_officer_id"] if verified else None,
                "verified_at": (t_find + datetime.timedelta(hours=4)).isoformat() if verified else None,
                "verification_notes": "Reviewed and confirmed by lead investigator." if verified else None,
                "created_at": t_find.isoformat(),
                "updated_at": t_find.isoformat()
            })

        # Investigation Notes
        for _ in range(self.counts["investigation_notes"]):
            case = random.choice(self.cases)
            t_note = self._random_dt(datetime.datetime.fromisoformat(case["opened_at"]), self.end_dt)

            self.investigation_notes.append({
                "note_id": str(uuid.uuid4()),
                "case_id": case["case_id"],
                "investigator_id": case["investigating_officer_id"],
                "note_title": f"Investigator Progress Note - {case['case_number']}",
                "note_text": f"Field briefing conducted. Followed up on witness statements and requested cell tower dumps.",
                "is_confidential": random.random() < 0.15,
                "tags": json.dumps(["field_notes", "briefing"]),
                "created_at": t_note.isoformat(),
                "updated_at": t_note.isoformat()
            })

        # Audit Logs
        actions = ["INSERT", "UPDATE", "VIEW", "SEARCH", "EXPORT"]
        records = ["cases", "persons", "evidence", "cctv_detections", "ai_findings"]
        for _ in range(self.counts["audit_logs"]):
            u = random.choice(self.users)
            rec = random.choice(records)
            self.audit_logs.append({
                "log_id": str(uuid.uuid4()),
                "user_id": u["user_id"],
                "action": random.choice(actions),
                "record_type": rec,
                "record_id": str(uuid.uuid4()),
                "old_values": None,
                "new_values": json.dumps({"action_context": "investigation_workflow"}),
                "ip_address": f"10.0.{random.randint(1, 254)}.{random.randint(1, 254)}",
                "user_agent": "CrimeMind-Client/1.0 (Authorized Investigator Terminal)",
                "created_at": self._random_dt().isoformat()
            })

    # ------------------------------------------------------------------------
    # STEP 16: Exporting to CSV / SQL
    # ------------------------------------------------------------------------
    def export(self, export_format="both"):
        os.makedirs(self.output_dir, exist_ok=True)
        print(f"\n[+] Exporting generated dataset to '{self.output_dir}' (Format: {export_format})...")

        tables_data = [
            ("users", self.users),
            ("locations", self.locations),
            ("cctv_cameras", self.cctv_cameras),
            ("persons", self.persons),
            ("vehicles", self.vehicles),
            ("cases", self.cases),
            ("incidents", self.incidents),
            ("case_persons", self.case_persons),
            ("evidence", self.evidence),
            ("statements", self.statements),
            ("relationships", self.relationships),
            ("call_records", self.call_records),
            ("transactions", self.transactions),
            ("cctv_detections", self.cctv_detections),
            ("person_locations", self.person_locations),
            ("events", self.timeline_events),
            ("agent_runs", self.agent_runs),
            ("ai_findings", self.ai_findings),
            ("investigation_notes", self.investigation_notes),
            ("audit_logs", self.audit_logs),
        ]

        if export_format in ("csv", "both"):
            print("[*] Writing high-speed PostgreSQL CSV files...")
            for tbl_name, rows in tables_data:
                csv_path = os.path.join(self.output_dir, f"{tbl_name}.csv")
                if not rows:
                    continue
                keys = list(rows[0].keys())
                with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=keys)
                    writer.writeheader()
                    writer.writerows(rows)
                print(f"    - {tbl_name}.csv: {len(rows):,} rows written.")

        if export_format in ("sql", "both"):
            sql_file = os.path.join(self.output_dir, "seed_data.sql")
            print(f"[*] Writing aggregated SQL copy/insert script to {sql_file}...")
            with open(sql_file, "w", encoding="utf-8") as f:
                f.write("-- CrimeMind Synthetic Data Import Script\n")
                f.write("SET client_encoding = 'UTF8';\n")
                f.write("SET synchronous_commit = OFF;\n\n")

                for tbl_name, rows in tables_data:
                    if not rows:
                        continue
                    cols = list(rows[0].keys())
                    f.write(f"\n-- Table: {tbl_name} ({len(rows)} records)\n")
                    f.write(f"COPY {tbl_name} ({', '.join(cols)}) FROM stdin WITH (FORMAT csv, HEADER false, QUOTE '\"', ESCAPE '\\');\n")
                    
                    csv_buffer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
                    for r in rows:
                        csv_buffer.writerow([r[c] if r[c] is not None else "\\N" for c in cols])
                    f.write("\\.\n")
            print(f"    - seed_data.sql written successfully.")

        # Summary manifest
        manifest = {
            "generated_at": datetime.datetime.now().isoformat(),
            "scale": self.scale,
            "seed": self.seed,
            "metrics": {tbl_name: len(rows) for tbl_name, rows in tables_data},
            "scenarios": [
                "Scenario 1: Repeated burglary network ('The Midnight Syndicate')",
                "Scenario 2: Vehicle appearing near multiple incidents ('Phantom Charger SYN-7X91')",
                "Scenario 3: Person communicating with multiple suspects ('Cipher Nexus Evelyn Reed')",
                "Scenario 4: Financial transaction followed by physical appearance near crime scene ('Trevor Bennett')",
                "Scenario 5: Same person/vehicle appearing across historical and current cases ('Viktor Orlov')"
            ]
        }
        with open(os.path.join(self.output_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        print("\n==============================================================================")
        print(" CRITICAL DATASET GENERATION SUMMARY:")
        print("==============================================================================")
        for tbl, count in manifest["metrics"].items():
            print(f"  {tbl:<22}: {count:>8,} records")
        print("==============================================================================")
        print(f"All files successfully generated into: {os.path.abspath(self.output_dir)}")
        print("==============================================================================\n")

    def run_all(self, export_format="both"):
        self.generate_users()
        self.generate_locations()
        self.generate_cctv_cameras()
        self.generate_persons_and_scenarios()
        self.generate_vehicles()
        self.generate_cases_and_incidents()
        self.generate_case_persons()
        self.generate_evidence()
        self.generate_relationships()
        self.generate_call_records()
        self.generate_transactions()
        self.generate_cctv_detections()
        self.generate_person_locations()
        self.generate_timeline_events()
        self.generate_supporting_ai_and_audit()
        self.export(export_format=export_format)


def main():
    parser = argparse.ArgumentParser(description="CrimeMind Synthetic Investigation Dataset Generator")
    parser.add_argument("--scale", type=float, default=1.0, help="Scale multiplier (1.0 = 10k persons, 100k CCTV/events; 0.1 for fast sample)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output-dir", type=str, default="database/seed/data", help="Target output directory")
    parser.add_argument("--format", type=str, choices=["csv", "sql", "both"], default="both", help="Export file format")

    args = parser.parse_args()

    generator = CrimeMindDataGenerator(scale=args.scale, seed=args.seed, output_dir=args.output_dir)
    generator.run_all(export_format=args.format)


if __name__ == "__main__":
    main()

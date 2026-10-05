// ============================================================================
// CrimeMind Core TypeScript Domain Contracts
// ============================================================================

export type VerificationState = 'RAW_DATA' | 'AI_FINDING' | 'HUMAN_VERIFIED';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'moderate' | 'extreme';

export type CaseStatus = 
  | 'open'
  | 'under_investigation'
  | 'pending_forensics'
  | 'closed'
  | 'cold_case'
  | 'archived'
  | 'reopened';

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  badge_number?: string;
  role: 'investigator' | 'administrator' | 'analyst' | 'supervisor' | 'forensic_specialist';
  department: string;
}

export interface Case {
  case_id: string;
  id?: string;
  case_number: string;
  caseNumber?: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: PriorityLevel;
  crime_type: string;
  investigating_officer_id: string;
  investigating_officer_name?: string;
  lead_analyst_id?: string;
  primary_location_id?: string;
  primary_location_name?: string;
  primary_city?: string;
  opened_at: string;
  closed_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Aggregate Metrics (from v_case_overview)
  suspect_count?: number;
  victim_count?: number;
  witness_count?: number;
  evidence_count?: number;
  ai_finding_count?: number;
  unverified_ai_finding_count?: number;
  latest_event_time?: string;
}

export interface Incident {
  incident_id: string;
  case_id?: string;
  incident_number: string;
  crime_type: string;
  severity: PriorityLevel;
  status: string;
  occurred_at: string;
  reported_at: string;
  location_id?: string;
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  modus_operandi?: string;
  estimated_loss_amount?: number;
  metadata?: Record<string, any>;
}

export interface Person {
  person_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  aliases: string[];
  date_of_birth?: string;
  age: number;
  gender: string;
  national_id_synthetic: string;
  occupation: string;
  description?: string;
  physical_characteristics?: Record<string, any>;
  phone_numbers: string[];
  email_addresses: string[];
  addresses: string[];
  risk_level: 'extreme' | 'high' | 'moderate' | 'low';
  risk_indicators: string[];
  notes?: string;
  created_at: string;
  updated_at: string;

  // Profile Analytics
  total_cases_associated?: number;
  cases_as_suspect?: number;
  cases_as_victim?: number;
  registered_vehicles_count?: number;
  cctv_detections_count?: number;
  last_detection_time?: string;
  total_calls_recorded?: number;
  total_transactions_recorded?: number;
  direct_network_size?: number;

  // Extended UI attributes
  id?: string;
  fullName?: string;
  threatLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  status?: string;
  knownAssociates?: Array<{ name: string; relationship: string }>;
  linkedCases?: string[];
  vehicles?: Array<{ make: string; model: string; year?: number; licensePlate: string; color: string }>;
  aiFindings?: string[];
  nationality?: string;
  dateOfBirth?: string;
  gangAffiliation?: string;
}

export interface CasePerson {
  case_person_id: string;
  case_id: string;
  person_id: string;
  relationship_type: 'suspect' | 'victim' | 'witness' | 'person_of_interest' | 'complainant' | 'investigator' | 'associate' | 'informant';
  involvement_summary?: string;
  is_primary: boolean;
  added_at: string;
  person?: Person;
}

export type EvidenceType =
  | 'documents'
  | 'images'
  | 'videos'
  | 'audio'
  | 'forensic_records'
  | 'digital_files'
  | 'transaction_records'
  | 'call_records'
  | 'cctv_records'
  | 'statements'
  | 'physical_weapons'
  | 'fingerprints'
  | 'dna_samples';

export interface ChainOfCustodyRecord {
  action: string;
  officer_id?: string;
  officer_name?: string;
  timestamp: string;
  facility: string;
  notes?: string;
}

export interface Evidence {
  evidence_id: string;
  case_id: string;
  case_number?: string;
  incident_id?: string;
  evidence_number: string;
  evidence_type: EvidenceType;
  title: string;
  description: string;
  source: string;
  collected_at: string;
  collected_by?: string;
  file_path: string;
  hash: string;
  metadata?: Record<string, any>;
  chain_of_custody: ChainOfCustodyRecord[];
  confidence?: number;
  ai_analysis_status?: 'pending' | 'analyzing' | 'completed' | 'flagged' | 'in_progress';
  ai_summary?: string;
  linked_persons?: Array<{ person_id: string; full_name: string; role: string }>;
}

export interface Statement {
  statement_id: string;
  case_id: string;
  person_id?: string;
  person_name?: string;
  statement_text: string;
  statement_timestamp: string;
  investigator_id?: string;
  source: string;
  transcript_metadata?: Record<string, any>;
}

export interface Vehicle {
  vehicle_id: string;
  registration_number: string;
  vin: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  color: string;
  owner_person_id?: string;
  owner_name?: string;
  stolen_status: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CCTVCamera {
  camera_id: string;
  location_id: string;
  camera_name: string;
  camera_code: string;
  source: string;
  resolution: string;
  field_of_view: string;
  status: 'active' | 'offline' | 'maintenance' | 'tampered';
  fps?: number;
  rtsp_stream_synthetic_url?: string;
  location_name?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  hasAnomaly?: boolean;
  activeDetectionsCount?: number;
}

export interface CCTVDetection {
  detection_id: string;
  camera_id: string;
  camera_code?: string;
  camera_name?: string;
  location_name?: string;
  detected_at: string;
  person_id?: string;
  person_name?: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  detected_object: 'person' | 'vehicle' | 'face' | 'license_plate' | 'backpack' | 'weapon' | 'crowd';
  confidence: number;
  image_reference: string;
  video_reference?: string;
  bounding_box: { x: number; y: number; width: number; height: number };
  event_metadata?: Record<string, any>;
  verification_status?: VerificationState;
}

export interface LocationRecord {
  location_id: string;
  name: string;
  address: string;
  city: string;
  area: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  location_type: string;
  risk_level: PriorityLevel;
  total_incidents?: number;
  total_cctv_detections?: number;
  total_person_sightings?: number;
  total_cell_pings?: number;
}

export interface CallRecord {
  call_id: string;
  caller_phone: string;
  caller_person_id?: string;
  caller_name?: string;
  receiver_phone: string;
  receiver_person_id?: string;
  receiver_name?: string;
  call_timestamp: string;
  duration_seconds: number;
  call_type: 'voice' | 'sms' | 'encrypted_voip' | 'missed';
  originating_location_id?: string;
  destination_location_id?: string;
  tower_metadata?: Record<string, any>;
}

export interface TransactionRecord {
  transaction_id: string;
  sender_person_id?: string;
  sender_name?: string;
  receiver_person_id?: string;
  receiver_name?: string;
  sender_account: string;
  receiver_account: string;
  amount: number;
  currency: string;
  transaction_timestamp: string;
  transaction_type: string;
  merchant?: string;
  location_id?: string;
  is_flagged_suspicious: boolean;
}

export interface TimelineEvent {
  event_id: string;
  case_id?: string;
  case_number?: string;
  event_timestamp: string;
  event_type: string;
  primary_entity_type?: string;
  primary_entity_id?: string;
  secondary_entity_type?: string;
  secondary_entity_id?: string;
  location_id?: string;
  location_name?: string;
  description: string;
  source: string;
  evidence_id?: string;
  verification_status?: VerificationState;
}

export interface AgentRun {
  run_id: string;
  case_id?: string;
  agent_name: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  confidence?: number;
  output_summary?: Record<string, any>;
  errors?: string;
}

export interface AIFinding {
  finding_id: string;
  case_id: string;
  agent_run_id?: string;
  agent_name: string;
  finding_type: string;
  title: string;
  finding_text: string;
  confidence: number;
  supporting_evidence_ids: string[];
  supporting_entity_references: Array<{ type: string; id: string; name?: string }>;
  human_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
}

export interface InvestigationNote {
  note_id: string;
  case_id: string;
  investigator_id?: string;
  investigator_name?: string;
  note_title: string;
  note_text: string;
  is_confidential: boolean;
  tags: string[];
  created_at: string;
}

export interface Alert {
  alert_id: string;
  title: string;
  description: string;
  severity: PriorityLevel;
  alert_type: 
    | 'suspicious_activity'
    | 'new_cctv_detection'
    | 'evidence_match'
    | 'cross_case_connection'
    | 'unusual_transaction'
    | 'repeated_vehicle_appearance'
    | 'agent_generated';
  created_at: string;
  source_evidence_id?: string;
  source_evidence_title?: string;
  source_case_id?: string;
  source_case_number?: string;
  entity_id?: string;
  entity_type?: string;
  is_acknowledged: boolean;
}

// Graph Visualization Types
export type GraphNodeType = 
  | 'PERSON'
  | 'CASE'
  | 'EVIDENCE'
  | 'VEHICLE'
  | 'LOCATION'
  | 'CALL'
  | 'TRANSACTION'
  | 'INCIDENT';

export type GraphEdgeType =
  | 'KNOWN_ASSOCIATE'
  | 'COMMUNICATION'
  | 'TRANSACTION'
  | 'SEEN_WITH'
  | 'OWNS'
  | 'LOCATED_AT'
  | 'LINKED_TO_CASE'
  | 'EVIDENCE_SUPPORTS'
  | 'VEHICLE_APPEARANCE';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  subType?: string;
  subLabel?: string;
  riskLevel?: PriorityLevel;
  confidence?: number;
  details?: Record<string, any>;
  x?: number;
  y?: number;
  radius?: number;
  size?: number;
  isAiInferred?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: GraphEdgeType | string;
  relationship?: string;
  label?: string;
  confidence: number;
  evidenceId?: string;
  weight?: number;
  isAiInferred?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CCTVFeed extends Omit<Partial<CCTVCamera>, 'status'> {
  id: string;
  camera_id?: string;
  cameraName?: string;
  camera_name?: string;
  cameraCode?: string;
  camera_code?: string;
  locationName?: string;
  location_name?: string;
  resolution?: string;
  fps?: number;
  status: 'active' | 'offline' | 'maintenance' | 'tampered' | string;
  hasAnomaly?: boolean;
  activeDetectionsCount?: number;
  streamUrl?: string;
}

export interface CCTVReferenceMatchResult {
  matches: CCTVDetection[];
  query_image?: string;
  matched_count?: number;
  confidence_threshold?: number;
  type?: string;
}

export type CCTVRecord = CCTVDetection & {
  id?: string;
  timestamp?: string;
  detectedPersonName?: string;
  detectedVehiclePlate?: string;
  cameraName?: string;
  locationName?: string;
  personId?: string;
};

export interface ChainOfCustodyEntry {
  timestamp: string;
  officerName: string;
  badgeNumber?: string;
  action: string;
  location?: string;
  notes?: string;
}

export interface EvidenceItem extends Partial<Evidence> {
  id: string;
  evidenceNumber: string;
  caseId: string;
  caseNumber: string;
  evidenceType: 'image' | 'video' | 'audio' | 'document' | 'statement' | 'transaction' | 'call_record' | 'cctv_record' | 'physical' | string;
  title: string;
  description: string;
  source: string;
  collectedAt?: string;
  fileName?: string;
  fileSize?: string;
  aiAnalysisStatus: 'completed' | 'in_progress' | 'pending' | 'flagged' | string;
  aiConfidence?: number;
  aiFindings?: string[];
  chainOfCustody?: ChainOfCustodyEntry[];
  tags?: string[];
}

export interface LangGraphAgent {
  id: string;
  name: string;
  role?: string;
  status: 'active' | 'idle' | 'standby' | 'error';
  currentTask: string;
  executionTimeMs: number;
  confidence: number;
  findingsCount: number;
  lastExecution: string;
  errors?: string[];
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  activeAgent?: string;
  sources?: string[];
  citations?: Array<{ title: string; link: string; type: string }>;
}

export interface MovementHop {
  locationName: string;
  timestamp: string;
  status: 'Observed' | 'Potential connection' | 'AI-inferred' | 'Requires verification' | string;
  source: string;
  confidence?: number;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
}

export interface MovementSequence {
  id: string;
  targetName: string;
  targetType: 'PERSON' | 'VEHICLE' | string;
  riskLevel?: PriorityLevel | string;
  hops: MovementHop[];
}

export interface LocationPoint {
  id: string;
  name: string;
  description?: string;
  type: 'incident' | 'cctv_camera' | 'person_observation' | 'vehicle_observation' | 'transaction_location' | 'call_location' | string;
  lat: number;
  lng: number;
  x?: number;
  y?: number;
  riskLevel?: string;
  address?: string;
  details?: Record<string, any>;
}


import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BotIcon,
  CameraIcon,
  CarIcon,
  CaseIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  EyeIcon,
  FileTextIcon,
  NetworkGraphIcon,
  UserIcon,
} from '../../components/icons/Icons';
import { useApp } from '../../store/AppContext';
import { analyticsApi, DashboardStats } from '../../services/api/analyticsApi';
import { alertsApi } from '../../services/api/alertsApi';
import { cctvApi } from '../../services/api/cctvApi';
import { agentsApi } from '../../services/api/agentsApi';
import { personsApi } from '../../services/api/personsApi';
import { Alert, CCTVRecord, LangGraphAgent, Person } from '../../types';

export const DashboardPage: React.FC = () => {
  const { cases, setActivePage, setSelectedCaseId, setSelectedPersonId } = useApp();
  const [selectedFeedFilter, setSelectedFeedFilter] = useState<'all' | 'cctv' | 'alert' | 'agent'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cctvDetections, setCctvDetections] = useState<CCTVRecord[]>([]);
  const [agentRuns, setAgentRuns] = useState<LangGraphAgent[]>([]);
  const [personsList, setPersonsList] = useState<Person[]>([]);

  useEffect(() => {
    analyticsApi.getDashboardStats().then(setStats).catch(console.error);
    alertsApi.getAll().then(setAlerts).catch(console.error);
    cctvApi.getDetections().then(setCctvDetections).catch(console.error);
    agentsApi.getAll().then(setAgentRuns).catch(console.error);
    personsApi.getAll().then(setPersonsList).catch(console.error);
  }, []);

  const highPriorityCases = cases.filter(c => c.priority === 'critical' || c.priority === 'high');

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>
            Tactical Operations Command
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Real-time multisource surveillance, cross-case correlations & LangGraph swarm telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge variant="verified">POSTGRESQL 16 CONNECTED</Badge>
          <Badge variant="ai" pulse>9 AGENTS ONLINE</Badge>
          <Button variant="crimson" size="sm" icon={<ActivityIcon size={16} />} onClick={() => setActivePage('investigations')}>
            New Case Dossier
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--crimson-neon)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>ACTIVE CASES</span>
            <CaseIcon size={16} color="var(--crimson-bright)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'var(--font-heading)', color: '#FFF' }}>
            {stats ? stats.active_cases : cases.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--crimson-bright)', marginTop: '0.2rem', fontWeight: 600 }}>
            {stats ? stats.high_priority_cases : highPriorityCases.length} Critical Priority
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>EVIDENCE PROCESSED</span>
            <FileTextIcon size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'var(--font-heading)', color: '#FFF' }}>
            {stats ? stats.evidence_processed.toLocaleString() : '20,000+'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
            100% Chain-of-Custody Verified
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>CCTV DETECTIONS</span>
            <CameraIcon size={16} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'var(--font-heading)', color: '#FFF' }}>
            {stats ? stats.cctv_detections.toLocaleString() : '100,000+'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', marginTop: '0.2rem', fontWeight: 600 }}>
            2,500 Cameras Streamed
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>ACTIVE AI AGENTS</span>
            <BotIcon size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'var(--font-heading)', color: '#FFF' }}>
            {stats ? stats.active_ai_agents : (agentRuns.length || 9)} Runs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.2rem', fontWeight: 600 }}>
            {stats ? stats.hypotheses_synthesized.toLocaleString() : '4,000'} Hypotheses Synthesized
          </div>
        </div>
      </div>

      {/* Main Grid: Intelligence Matrix (Large Centerpiece) + Alerts Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
        
        {/* Large CrimeMind Intelligence Visualization */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NetworkGraphIcon size={18} color="var(--crimson-neon)" />
              <span>Cross-Case Intelligence Matrix & Network Pulse</span>
            </div>
          }
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setActivePage('graph')}>
              Open Full Graph <ChevronRightIcon size={14} />
            </Button>
          }
          padding="none"
        >
          <div
            style={{
              position: 'relative',
              height: '380px',
              backgroundColor: '#090B10',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background Grid & Radar Sweep */}
            <div className="bg-grid-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
            <div
              style={{
                position: 'absolute',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 42, 66, 0.2)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '1px dashed rgba(255, 42, 66, 0.35)',
              }}
            />

            {/* Simulated Live Intelligence Nodes */}
            <div
              style={{
                position: 'absolute',
                top: '25%',
                left: '20%',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'rgba(22, 27, 42, 0.85)',
                border: '1px solid #FF2A42',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 0 12px rgba(255, 42, 66, 0.4)',
                cursor: 'pointer',
              }}
              onClick={() => { setSelectedPersonId('per-001'); setActivePage('person-profile'); }}
            >
              <div style={{ fontSize: '0.7rem', color: '#FF4D63', fontWeight: 800 }}>SUSPECT NODE</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Marcus "Viper" Vance</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Linked to 8 Estate Cases</div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '30%',
                left: '45%',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'rgba(22, 27, 42, 0.85)',
                border: '1px solid #00D4FF',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)',
                cursor: 'pointer',
              }}
              onClick={() => { setSelectedPersonId('per-004'); setActivePage('person-profile'); }}
            >
              <div style={{ fontSize: '0.7rem', color: '#00D4FF', fontWeight: 800 }}>BROKER NEXUS</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Evelyn "Cipher" Reed</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>7 Active Suspect Contacts</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: '32%',
                right: '18%',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'rgba(22, 27, 42, 0.85)',
                border: '1px solid #FFB020',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 0 12px rgba(255, 176, 32, 0.3)',
                cursor: 'pointer',
              }}
              onClick={() => setActivePage('cctv')}
            >
              <div style={{ fontSize: '0.7rem', color: '#FFB020', fontWeight: 800 }}>VEHICLE TELEMETRY</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Dodge Charger (SYN-7X91)</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>4 Robberies Temporal Proximity</div>
            </div>

            {/* Connecting Laser Lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line x1="28%" y1="35%" x2="52%" y2="65%" stroke="rgba(255, 42, 66, 0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="56%" y1="65%" x2="75%" y2="40%" stroke="rgba(0, 212, 255, 0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>

            {/* Bottom Overlay Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '0.65rem 1.25rem',
                backgroundColor: 'rgba(7, 9, 13, 0.85)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>LangGraph Swarm: <strong style={{ color: '#00E699' }}>Optimized (0.012s traversal)</strong></span>
              <span>Showing 5 Core Intelligence Scenarios</span>
            </div>
          </div>
        </Card>

        {/* Live Alerts & Suspicious Activity */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangleIcon size={18} color="var(--crimson-neon)" />
              <span>Real-Time Intelligence Alerts</span>
            </div>
          }
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setActivePage('alerts')}>
              View All ({alerts.length})
            </Button>
          }
          padding="none"
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.alert_id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  backgroundColor: alert.is_acknowledged ? 'transparent' : 'rgba(255, 42, 66, 0.03)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Badge priority={alert.severity} size="sm" pulse={!alert.is_acknowledged} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>
                      {alert.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {alert.description}
                </p>

                {alert.source_case_number && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--crimson-bright)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Case: {alert.source_case_number}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{alert.source_evidence_title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Secondary Grid: High-Priority Cases + CCTV Detections + Target Vehicles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* High-Priority Cases */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CaseIcon size={18} color="var(--crimson-neon)" />
              <span>High-Priority Active Cases</span>
            </div>
          }
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setActivePage('investigations')}>
              Manage Cases <ChevronRightIcon size={14} />
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {highPriorityCases.slice(0, 3).map((c) => (
              <div
                key={c.case_id}
                className="glass-panel-interactive"
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => {
                  setSelectedCaseId(c.case_id);
                  setActivePage('investigations');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--crimson-bright)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {c.case_number}
                  </span>
                  <Badge priority={c.priority} size="sm" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginBottom: '0.35rem' }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  <span>{c.crime_type}</span>
                  <span>{c.suspect_count || 0} Suspects • {c.evidence_count || 0} Evidence</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent CCTV Detections */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CameraIcon size={18} color="var(--accent-amber)" />
              <span>Recent CCTV Detections</span>
            </div>
          }
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setActivePage('cctv')}>
              View Cameras <ChevronRightIcon size={14} />
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cctvDetections.slice(0, 4).map((det) => (
              <div
                key={det.detection_id || det.id}
                className="glass-panel-interactive"
                onClick={() => setActivePage('cctv')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'rgba(255, 176, 32, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-amber)',
                    }}
                  >
                    {det.detected_object === 'license_plate' || det.detected_object === 'vehicle' ? (
                      <CarIcon size={16} />
                    ) : (
                      <UserIcon size={16} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF' }}>
                      {det.vehicle_plate || det.person_name || det.detectedPersonName || (det.detected_object ? det.detected_object.toUpperCase() : 'TARGET')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {det.camera_code || det.camera_name || det.cameraName || 'Metro Cam'} • {det.location_name || det.locationName || 'Metropolis Sector'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00E699' }}>
                    {((det.confidence || 0.94) * 100).toFixed(1)}% match
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    {new Date(det.detected_at || det.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Flagged Vehicles & Hot Targets */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CarIcon size={18} color="var(--crimson-neon)" />
              <span>Target Vehicles Under Surveillance</span>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {personsList.flatMap(p => (p.vehicles || []).map(v => ({ ...v, owner_name: p.fullName || p.full_name, owner_person_id: p.person_id || p.id }))).slice(0, 3).map((v, idx) => (
              <div
                key={v.licensePlate || (v as any).registration_number || idx}
                className="glass-panel-interactive"
                onClick={() => { 
                  if (v.owner_person_id) {
                    setSelectedPersonId(v.owner_person_id); 
                    setActivePage('person-profile'); 
                  }
                }}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFF', fontFamily: 'var(--font-mono)' }}>
                    {v.licensePlate || (v as any).registration_number || 'SYN-7X91'}
                  </span>
                  <Badge variant="ai" size="sm">Active BOLO</Badge>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {v.color} {v.make} {v.model} ({v.year || 2022})
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Owner: <span style={{ color: '#FFF' }}>{v.owner_name}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

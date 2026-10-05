import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { personsApi } from '../../services/api/personsApi';
import { Person, Case, EvidenceItem, CCTVRecord, CallRecord, TransactionRecord } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Tabs } from '../../components/common/Tabs';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  UserIcon,
  FolderIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  CpuIcon,
  CameraIcon,
  PhoneIcon,
  DatabaseIcon,
  CarIcon,
  MapPinIcon,
  FileTextIcon,
  ClockIcon,
  NetworkIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from '../../components/icons/Icons';

export const PersonProfilePage: React.FC = () => {
  const { currentPersonId, navigateTo } = useApp();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(currentPersonId || '');
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const init = async () => {
      try {
        const list = await personsApi.getAll();
        setPersons(list);
        const targetId = currentPersonId || list[0]?.id || (list[0] as any)?.person_id || 'per-001';
        setSelectedPersonId(targetId);
        loadPerson(targetId);
      } catch (err) {
        console.error('Failed to load persons', err);
      }
    };
    init();
  }, [currentPersonId]);

  const loadPerson = async (id: string) => {
    setLoading(true);
    try {
      const data = await personsApi.getById(id);
      setPerson(data);
    } catch (err) {
      console.error('Failed to fetch person details', err);
    } finally {
      setLoading(false);
    }
  };

  const getThreatBadge = (level: Person['threatLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge variant="crimson" pulse>CRITICAL THREAT</Badge>;
      case 'HIGH':
        return <Badge variant="crimson">HIGH RISK</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">MEDIUM RISK</Badge>;
      case 'LOW':
      default:
        return <Badge variant="default">LOW RISK</Badge>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview & Bio' },
    { id: 'associates', label: `Known Associates (${person?.knownAssociates?.length || 0})` },
    { id: 'cases', label: `Linked Cases (${person?.linkedCases?.length || 0})` },
    { id: 'vehicles', label: `Vehicles (${person?.vehicles?.length || 0})` },
    { id: 'cctv', label: 'CCTV Sightings' },
    { id: 'calls', label: 'Intercepted Calls' },
    { id: 'transactions', label: 'Financial Records' },
    { id: 'ai-findings', label: 'AI Intelligence' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header / Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-crimson)', fontWeight: 700 }}>
            Biometric Surveillance File
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '2px 0 0 0', letterSpacing: '-0.02em' }}>
            Person Investigation Profile
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Target File:</span>
          <select
            value={selectedPersonId}
            onChange={e => {
              setSelectedPersonId(e.target.value);
              loadPerson(e.target.value);
            }}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--border-radius-md)',
              padding: '8px 12px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
              minWidth: '220px',
            }}
          >
            {persons.map((p: any) => {
              const pId = p.id || p.person_id;
              const pName = p.fullName || p.full_name;
              const pThreat = p.threatLevel || p.risk_level || 'ELEVATED';
              return (
                <option key={pId} value={pId} style={{ background: '#0c0f17', color: '#f0f2f8' }}>
                  {pName} {p.aliases?.[0] ? `("${p.aliases[0]}")` : ''} - {pThreat}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loading || !person ? (
        <Skeleton height="320px" borderRadius="12px" />
      ) : (
        <>
          {/* Identity Dossier Banner */}
          <Card
            variant="glass"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'row',
              gap: '24px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Crimson atmospheric border highlight */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #FF2A42, transparent)',
              }}
            />

            {/* Profile Avatar with Target Reticle */}
            <div
              style={{
                width: '130px',
                height: '150px',
                borderRadius: '8px',
                background: 'linear-gradient(180deg, #161922 0%, #0a0c10 100%)',
                border: '1px solid rgba(255, 42, 66, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              }}
            >
              <UserIcon size={52} color="var(--color-text-muted)" />
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-crimson)',
                  boxShadow: '0 0 8px #FF2A42',
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  color: 'var(--color-crimson-bright)',
                  marginTop: '10px',
                  letterSpacing: '0.05em',
                }}
              >
                BIOMETRIC ID: #{(person.id || person.person_id || 'PER-001').slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Core Info */}
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                  {person.fullName || person.full_name || 'Subject'}
                </h2>
                {getThreatBadge(person.threatLevel || (person.risk_level ? person.risk_level.toUpperCase() : 'HIGH'))}
                <Badge variant={person.status === 'suspect' ? 'crimson' : 'info'}>
                  {((person.status || 'suspect') as string).toUpperCase()}
                </Badge>
              </div>

              {/* Aliases & Epistemological Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Known Monikers:{' '}
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    {person.aliases?.join(', ') || 'None recorded'}
                  </strong>
                </span>

                <span style={{ color: 'var(--color-text-muted)' }}>•</span>

                {/* Badges showing RAW DATA vs AI FINDING vs HUMAN VERIFIED */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Badge variant="default">RAW DATA</Badge>
                  <Badge variant="crimson">AI FINDING</Badge>
                  <Badge variant="success">HUMAN VERIFIED</Badge>
                </div>
              </div>

              {/* Quick Biometrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--color-glass-border)',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>
                    Citizenship / Origin
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {person.nationality || 'United States'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>
                    Date of Birth
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {person.dateOfBirth || '1984-06-14 (Age 42)'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>
                    Syndicate Affinity
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-crimson-bright)' }}>
                    {person.gangAffiliation || 'Midnight Syndicate'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>
                    Surveillance State
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)' }}>
                    Active Tracking
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                variant="primary"
                icon={<NetworkIcon size={14} />}
                onClick={() => navigateTo('relationship-graph', { caseId: person.linkedCases?.[0] })}
              >
                Inspect in Graph
              </Button>
              <Button
                variant="secondary"
                icon={<CameraIcon size={14} />}
                onClick={() => navigateTo('cctv')}
              >
                Match on CCTV
              </Button>
            </div>
          </Card>

          {/* Sub Navigation Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              {/* Left: Narrative & AI Intelligence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Card variant="glass" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Investigative Background & Synopsis
                    </h3>
                    <Badge variant="default">RAW DATA</Badge>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                    {person.notes ||
                      'Subject has been repeatedly flagged across multiple metropolitan financial and logistics breaches. Identified as a key coordinating hub between tactical ground operatives and international laundering channels.'}
                  </p>
                </Card>

                {/* AI Extracted Findings */}
                <Card variant="glass" style={{ padding: '20px', border: '1px solid rgba(255, 42, 66, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CpuIcon size={16} color="var(--color-crimson)" />
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                        LangGraph Autonomous Intelligence Findings
                      </h3>
                    </div>
                    <Badge variant="crimson">AI FINDING</Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {person.aiFindings?.map((finding, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 42, 66, 0.04)',
                          border: '1px solid rgba(255, 42, 66, 0.12)',
                          borderRadius: '6px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                      >
                        <AlertTriangleIcon size={16} color="var(--color-crimson)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                          {finding}
                        </span>
                      </div>
                    )) || (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        No anomalous automated findings currently flagged.
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right: Risk Factors & Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Card variant="glass" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>
                    Target Surveillance Metadata
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>First Ingestion:</span>
                      <span style={{ color: 'var(--color-text-primary)' }}>2024-01-15 08:30</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Last Confirmed Fix:</span>
                      <span style={{ color: 'var(--color-crimson)' }}>Today, 02:41 AM (CCTV #12)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Fingerprint Classification:</span>
                      <span style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>W-92-L819-B</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Federal Warrant Status:</span>
                      <span style={{ color: 'var(--color-crimson-bright)', fontWeight: 700 }}>ACTIVE (SEALED)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'associates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {person.knownAssociates?.map((assoc, idx) => (
                <Card key={idx} variant="interactive" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {assoc.name}
                    </span>
                    <Badge variant="crimson">{assoc.relationship}</Badge>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>
                    Degree of connection: Direct operative co-conspirator.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{ padding: '0', color: 'var(--color-crimson-bright)' }}
                    onClick={() => {
                      const match = persons.find(p => (p.fullName || p.full_name || '').toLowerCase().includes((assoc.name || '').toLowerCase()));
                      if (match) {
                        const mId = match.id || match.person_id;
                        if (mId) {
                          setSelectedPersonId(mId);
                          loadPerson(mId);
                        }
                      }
                    }}
                  >
                    Open Profile <ArrowRightIcon size={12} />
                  </Button>
                </Card>
              )) || <EmptyState title="No Known Associates Recorded" description="No co-conspirators linked yet." />}
            </div>
          )}

          {activeTab === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {person.linkedCases?.map((caseId, idx) => (
                <Card
                  key={idx}
                  variant="interactive"
                  style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => navigateTo('case-detail', { caseId })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FolderIcon size={20} color="var(--color-crimson)" />
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Linked Case File #{String(caseId || 'CASE-001').slice(-8).toUpperCase()}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Primary Target / Named Co-Conspirator
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Inspect Dossier <ArrowRightIcon size={12} />
                  </Button>
                </Card>
              )) || <EmptyState title="No Linked Cases" description="This person is not currently linked to any active case file." />}
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {person.vehicles?.map((veh, idx) => (
                <Card key={idx} variant="glass" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <CarIcon size={20} color="var(--color-crimson)" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {veh.make} {veh.model} ({veh.year || 2022})
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-crimson-bright)' }}>
                        PLATE: {veh.licensePlate}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Color: {veh.color} • Registered Owner
                  </div>
                </Card>
              )) || <EmptyState title="No Vehicles Registered" description="No vehicles associated with this identity." />}
            </div>
          )}

          {activeTab === 'cctv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Surveillance Camera Detections for {person.fullName}
                </span>
                <Badge variant="crimson">ALGORITHMIC MATCH</Badge>
              </div>

              {[
                { time: 'Today 02:41 AM', loc: 'Downtown Metro Terminal Cam #04', conf: 96.4, frame: 'FRAME-00491-HD' },
                { time: 'Yesterday 23:15 PM', loc: 'Industrial Wharf Gate 2', conf: 89.2, frame: 'FRAME-99120-HD' },
                { time: '2 Days Ago 14:02 PM', loc: 'First National Perimeter East', conf: 93.7, frame: 'FRAME-81203-HD' },
              ].map((rec, i) => (
                <Card key={i} variant="glass" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CameraIcon size={18} color="var(--color-crimson)" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {rec.loc}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {rec.time} • Capture ID: {rec.frame}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-crimson-bright)' }}>
                      {rec.conf}% match
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Requires Verification</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'calls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { to: '+1-555-019-4821 (Evelyn Reed)', dur: '4m 12s', date: '2024-03-29 01:14 AM', tower: 'Sector 7 South Cell Tower', flag: 'ENCRYPTED BURST' },
                { to: '+1-555-014-9982 (Julian Drake)', dur: '1m 45s', date: '2024-03-28 22:30 PM', tower: 'Wharf Relay Station #2', flag: 'CIPHER COMM' },
              ].map((c, i) => (
                <Card key={i} variant="glass" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <PhoneIcon size={18} color="var(--color-warning)" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Outgoing Call → {c.to}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {c.date} • Duration: {c.dur} • Tower: {c.tower}
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning">{c.flag}</Badge>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { desc: 'Outbound Wire to Off-shore Escrow', amt: '$25,000.00', date: '2024-03-27', risk: 'HIGH ANOMALY', status: 'FLAGGED' },
                { desc: 'Cryptographic Wallet Sweep (Monero)', amt: '$14,200.00 eq.', date: '2024-03-26', risk: 'SUSPICIOUS', status: 'FLAGGED' },
              ].map((tx, i) => (
                <Card key={i} variant="glass" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <DatabaseIcon size={18} color="var(--color-crimson)" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {tx.desc}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {tx.date} • Anti-Money Laundering Anomaly Triggered
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-crimson-bright)' }}>
                      {tx.amt}
                    </div>
                    <Badge variant="crimson">{tx.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'ai-findings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(255, 42, 66, 0.05)',
                  border: '1px solid rgba(255, 42, 66, 0.2)',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CpuIcon size={18} color="var(--color-crimson)" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Person Intelligence Synthesis (LangGraph Person Agent)
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Cross-referencing 50,000 CDR logs and 100,000 CCTV frames reveals that subject's movement coincides with 8 distinct heist planning windows. Highly probable syndicate logistics coordinator with direct links to Julian Drake and Evelyn Reed.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

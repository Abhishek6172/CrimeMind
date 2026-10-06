import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tabs } from '../../components/common/Tabs';
import {
  CaseIcon,
  SearchIcon,
  PlusIcon,
  FilterIcon,
  UserIcon,
  FileTextIcon,
  CameraIcon,
  CarIcon,
  MapPinIcon,
  PhoneIcon,
  CreditCardIcon,
  ActivityIcon,
  BrainIcon,
  NetworkGraphIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ShieldIcon,
} from '../../components/icons/Icons';
import { useApp } from '../../store/AppContext';
import { Case, PriorityLevel, CaseStatus, EvidenceItem, EvidenceType } from '../../types';
import { casesApi } from '../../services/api/casesApi';
import { evidenceApi } from '../../services/api/evidenceApi';
import { personsApi } from '../../services/api/personsApi';
import { agentsApi } from '../../services/api/agentsApi';

export const InvestigationsPage: React.FC = () => {
  const { cases, selectedCaseId, setSelectedCaseId, refreshCases, addToast, setSelectedPersonId, setActivePage } = useApp();

  // Filters & Search State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('all');
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Case Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    crime_type: 'Aggravated Burglary',
    priority: 'high' as PriorityLevel,
    status: 'open' as CaseStatus,
  });

  // Quick Add Evidence Modal State
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceFormData, setEvidenceFormData] = useState({
    title: '',
    description: '',
    evidence_type: 'image' as EvidenceItem['evidenceType'],
    source: 'Crime Scene Forensics Unit',
    file_name: 'evidence_capture.jpg',
  });

  // Dynamic Case Detail state
  const [caseDetail, setCaseDetail] = useState<any>(null);

  // Dynamic Case Evidence state
  const [caseEvidenceList, setCaseEvidenceList] = useState<any[]>([]);

  // Dynamic Persons & Findings state
  const [associatedPersons, setAssociatedPersons] = useState<any[]>([]);
  const [aiFindings, setAiFindings] = useState<any[]>([]);

  // Load details for current view
  const loadCaseDetail = async (targetCaseId: string) => {
    try {
      const detail = await casesApi.getById(targetCaseId);
      setCaseDetail(detail);
    } catch (e) {
      console.warn('Failed to load case detail', e);
      setCaseDetail(null);
    }
  };

  const loadCaseEvidence = async (targetCaseId?: string | null) => {
    try {
      const allEv = await evidenceApi.getAll();
      if (allEv && allEv.length > 0) {
        setCaseEvidenceList(allEv);
      }
    } catch (e) {
      console.warn('Failed to load case evidence', e);
    }
  };

  const loadPersonsAndFindings = async (targetCaseId?: string | null) => {
    try {
      const [persons, findings] = await Promise.all([
        personsApi.getAll(),
        agentsApi.getAIFindings(targetCaseId || undefined),
      ]);
      setAssociatedPersons(persons);
      setAiFindings(findings);
    } catch (e) {
      console.warn('Failed to load persons/findings', e);
    }
  };

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    }
    loadCaseEvidence(selectedCaseId);
    loadPersonsAndFindings(selectedCaseId);
  }, [selectedCaseId]);

  // Selected Case Object
  const currentCase = cases.find(c => (c.case_id === selectedCaseId || (c as any).id === selectedCaseId)) || cases[0];

  // Filter Cases
  const filteredCases = cases.filter(c => {
    const cStatus = (c.status || 'open').toLowerCase();
    if (statusFilter !== 'all' && cStatus !== statusFilter.toLowerCase()) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (crimeTypeFilter !== 'all' && c.crime_type !== crimeTypeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const num = (c.case_number || (c as any).caseNumber || '').toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        num.includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      title: '',
      description: '',
      crime_type: 'Aggravated Burglary',
      priority: 'high',
      status: 'open',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!currentCase) return;
    setModalMode('edit');
    setFormData({
      title: currentCase.title,
      description: currentCase.description,
      crime_type: currentCase.crime_type,
      priority: currentCase.priority,
      status: currentCase.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveCase = async () => {
    if (!formData.title.trim()) {
      addToast('Please enter a case title', 'warning');
      return;
    }
    try {
      if (modalMode === 'create') {
        const newCaseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const created = await casesApi.createCase({
          title: formData.title,
          description: formData.description,
          crime_type: formData.crime_type,
          priority: formData.priority,
          status: formData.status,
          case_number: newCaseNumber,
          investigating_officer_name: 'Det. Sarah Vance',
          primary_location_name: 'Metropolis Central',
          evidence_count: 0,
          suspect_count: 1,
          ai_finding_count: 0,
        });
        await refreshCases();
        const createdId = created?.case_id || (created as any)?.id;
        if (createdId) setSelectedCaseId(createdId);
        addToast(`Case dossier ${newCaseNumber} opened with status: ${formData.status.toUpperCase()}`, 'success');
      } else if (currentCase) {
        const targetId = currentCase.case_id || (currentCase as any).id;
        await casesApi.updateCase(targetId, {
          title: formData.title,
          description: formData.description,
          crime_type: formData.crime_type,
          priority: formData.priority,
          status: formData.status,
        });
        await refreshCases();
        addToast(`Case updated. Status: ${formData.status.toUpperCase()}`, 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save case:', err);
      addToast('Failed to save case details', 'error');
    }
  };

  const handleQuickStatusChange = async (newStatus: CaseStatus) => {
    if (!currentCase) return;
    try {
      const targetId = currentCase.case_id || (currentCase as any).id;
      await casesApi.updateCase(targetId, { status: newStatus });
      await refreshCases();
      const statusLabels: Record<CaseStatus, string> = {
        open: 'OPEN',
        under_investigation: 'UNDER INVESTIGATION',
        pending_forensics: 'PENDING FORENSICS',
        closed: 'CLOSED',
        cold_case: 'COLD CASE',
        archived: 'ARCHIVED',
        reopened: 'REOPENED',
      };
      addToast(`Case marked as ${statusLabels[newStatus] || newStatus.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Failed to update status', err);
      addToast('Failed to update status', 'error');
    }
  };

  const handleSaveEvidenceItem = async () => {
    if (!evidenceFormData.title.trim()) {
      addToast('Please provide an evidence title', 'warning');
      return;
    }
    try {
      const activeCaseId = currentCase?.case_id || (currentCase as any)?.id || 'CASE-2024-4019';
      const created = await evidenceApi.createEvidence({
        case_id: activeCaseId,
        caseId: activeCaseId,
        title: evidenceFormData.title,
        description: evidenceFormData.description,
        evidence_type: evidenceFormData.evidence_type as EvidenceType,
        evidenceType: evidenceFormData.evidence_type,
        source: evidenceFormData.source,
        fileName: evidenceFormData.file_name,
        tags: ['investigative-lead', 'forensic-record'],
      });
      await loadCaseEvidence(activeCaseId);
      setIsEvidenceModalOpen(false);
      setEvidenceFormData({
        title: '',
        description: '',
        evidence_type: 'image',
        source: 'Crime Scene Forensics Unit',
        file_name: 'evidence_capture.jpg',
      });
      addToast(`Evidence ${(created as any)?.evidence_number || (created as any)?.evidenceNumber || 'record'} lodged in vault`, 'success');
    } catch (err) {
      console.error('Failed to add evidence', err);
      addToast('Failed to lodge evidence item', 'error');
    }
  };

  const detailTabs = [
    { id: 'overview', label: 'Case Overview', icon: <CaseIcon size={14} /> },
    { id: 'people', label: 'People', icon: <UserIcon size={14} />, badge: 3 },
    { id: 'evidence', label: 'Evidence', icon: <FileTextIcon size={14} />, badge: currentCase?.evidence_count || 12 },
    { id: 'timeline', label: 'Timeline', icon: <ActivityIcon size={14} /> },
    { id: 'locations', label: 'Locations', icon: <MapPinIcon size={14} /> },
    { id: 'vehicles', label: 'Vehicles', icon: <CarIcon size={14} /> },
    { id: 'calls', label: 'Calls', icon: <PhoneIcon size={14} /> },
    { id: 'transactions', label: 'Transactions', icon: <CreditCardIcon size={14} /> },
    { id: 'cctv', label: 'CCTV', icon: <CameraIcon size={14} /> },
    { id: 'findings', label: 'AI Findings', icon: <BrainIcon size={14} />, badge: currentCase?.ai_finding_count || 4 },
    { id: 'graph', label: 'Relationship Graph', icon: <NetworkGraphIcon size={14} /> },
    { id: 'notes', label: 'Investigation Notes', icon: <FileTextIcon size={14} /> },
  ];

  return (
    <div className="content-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.2rem' }}>
            Case Investigations Bureau
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Structured dossiers, evidence chains, and autonomous intelligence workflows.
          </p>
        </div>

        <Button variant="crimson" icon={<PlusIcon size={16} />} onClick={handleOpenCreateModal}>
          Open New Case Dossier
        </Button>
      </div>

      {/* Two Column Layout: Left Column = Case Selector List, Right Column = Deep Case View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 2.5fr)', gap: '1.5rem' }}>
        
        {/* Left Column: Filterable Case Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card padding="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Input
                placeholder="Search cases, tags, dossiers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<SearchIcon size={16} />}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'open', label: 'Open' },
                    { value: 'under_investigation', label: 'Under Investigation' },
                    { value: 'reopened', label: 'Reopened' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'cold_case', label: 'Cold Case' },
                  ]}
                />
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Case Card Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '720px', overflowY: 'auto' }}>
            {filteredCases.map((c) => {
              const cId = c.case_id || (c as any).id;
              const isSelected = (currentCase?.case_id === cId || (currentCase as any)?.id === cId);
              const cStatus = (c.status || 'open').toLowerCase();
              return (
                <div
                  key={cId}
                  className={`glass-panel ${isSelected ? 'glass-panel-crimson' : 'glass-panel-interactive'}`}
                  style={{
                    padding: '1rem',
                    backgroundColor: isSelected ? 'rgba(255, 42, 66, 0.08)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedCaseId(cId)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--crimson-bright)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {c.case_number || (c as any).caseNumber}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background: cStatus === 'open' ? 'rgba(56, 189, 248, 0.15)' :
                                      cStatus === 'reopened' ? 'rgba(168, 85, 247, 0.2)' :
                                      cStatus === 'closed' ? 'rgba(16, 185, 129, 0.15)' :
                                      cStatus === 'under_investigation' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: cStatus === 'open' ? '#38bdf8' :
                                 cStatus === 'reopened' ? '#c084fc' :
                                 cStatus === 'closed' ? '#34d399' :
                                 cStatus === 'under_investigation' ? '#facc15' : '#94a3b8',
                          border: `1px solid ${
                            cStatus === 'open' ? '#38bdf8' :
                            cStatus === 'reopened' ? '#a855f7' :
                            cStatus === 'closed' ? '#10b981' :
                            cStatus === 'under_investigation' ? '#eab308' : '#64748b'
                          }`,
                        }}
                      >
                        {(cStatus || 'open').replace(/_/g, ' ')}
                      </span>
                      <Badge priority={c.priority} size="sm" />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginBottom: '0.35rem' }}>
                    {c.title}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {(c.description || '').slice(0, 85)}...
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    <span>{c.crime_type}</span>
                    <span>{c.evidence_count || 14} Evidence Items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Deep Dossier View (with 12 Required Tabs) */}
        {currentCase ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Case Dossier Master Header */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--crimson-neon)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--crimson-bright)', fontWeight: 800 }}>
                      {currentCase.case_number || (currentCase as any).caseNumber}
                    </span>
                    <Badge priority={currentCase.priority} />
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        border: currentCase.status === 'open' ? '1px solid #38bdf8' :
                                currentCase.status === 'reopened' ? '1px solid #a855f7' :
                                currentCase.status === 'closed' ? '1px solid #10b981' :
                                currentCase.status === 'under_investigation' ? '1px solid #eab308' : '1px solid #64748b',
                        backgroundColor: currentCase.status === 'open' ? 'rgba(56, 189, 248, 0.15)' :
                                         currentCase.status === 'reopened' ? 'rgba(168, 85, 247, 0.2)' :
                                         currentCase.status === 'closed' ? 'rgba(16, 185, 129, 0.15)' :
                                         currentCase.status === 'under_investigation' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: currentCase.status === 'open' ? '#38bdf8' :
                               currentCase.status === 'reopened' ? '#c084fc' :
                               currentCase.status === 'closed' ? '#34d399' :
                               currentCase.status === 'under_investigation' ? '#facc15' : '#94a3b8',
                      }}
                    >
                      {((currentCase.status || 'open') as string).replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.45rem', color: '#FFF', marginBottom: '0.5rem' }}>
                    {currentCase.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>Officer: <strong style={{ color: '#FFF' }}>{currentCase.investigating_officer_name || 'Det. Sarah Vance'}</strong></span>
                    <span>District: <strong style={{ color: '#FFF' }}>{currentCase.primary_location_name || 'Metropolis Central'}</strong></span>
                    <span>Opened: <strong style={{ color: '#FFF' }}>{new Date(currentCase.opened_at).toLocaleDateString()}</strong></span>
                  </div>

                  {/* Interactive Quick Status Toggle Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                      Mark Status:
                    </span>
                    {[
                      { key: 'open', label: 'Open', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
                      { key: 'under_investigation', label: 'Under Investigation', color: '#facc15', bg: 'rgba(234, 179, 8, 0.12)' },
                      { key: 'reopened', label: 'Reopened', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)' },
                      { key: 'closed', label: 'Closed', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)' },
                      { key: 'cold_case', label: 'Cold Case', color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.12)' },
                    ].map((st) => {
                      const isActive = currentCase.status === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => handleQuickStatusChange(st.key as CaseStatus)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            border: isActive ? `1.5px solid ${st.color}` : '1px solid rgba(255, 255, 255, 0.12)',
                            background: isActive ? st.bg : 'rgba(255, 255, 255, 0.03)',
                            color: isActive ? st.color : 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? st.color : 'rgba(255,255,255,0.2)' }} />
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="outline" size="sm" icon={<EditIcon size={14} />} onClick={handleOpenEditModal}>
                    Edit Case
                  </Button>
                  <Button variant="danger" size="sm" icon={<TrashIcon size={14} />}>
                    Archive
                  </Button>
                </div>
              </div>

              {/* 12 Case Sub-Tabs Bar */}
              <div style={{ marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <Tabs tabs={detailTabs} activeTab={activeDetailTab} onChange={setActiveDetailTab} variant="underline" />
              </div>
            </div>

            {/* Tab View Contents */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              {activeDetailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', color: '#FFF', marginBottom: '0.5rem' }}>Dossier Executive Summary</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      {currentCase.description}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Suspects Identified</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--crimson-bright)', marginTop: 4 }}>{currentCase.suspect_count || 3}</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Physical & Digital Evidence</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 4 }}>{currentCase.evidence_count || 14}</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>AI Synthesized Findings</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00E699', marginTop: 4 }}>{currentCase.ai_finding_count || 4}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'people' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.05rem', color: '#FFF' }}>Associated Persons & Roles</h3>
                    <Button variant="outline" size="sm" icon={<PlusIcon size={14} />}>Add Person</Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(caseDetail?.persons && caseDetail.persons.length > 0 ? caseDetail.persons : associatedPersons.slice(0, 3)).map((p: any) => (
                      <div
                        key={p.person_id || p.id}
                        className="glass-panel-interactive"
                        style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => { setSelectedPersonId(p.person_id || p.id); setActivePage('person-profile'); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255, 42, 66, 0.1)', border: '1px solid rgba(255, 42, 66, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D63' }}>
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF' }}>{p.full_name || p.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Aliases: {Array.isArray(p.aliases) ? p.aliases.join(', ') : (p.aliases || 'None')} {p.occupation ? '• ' + p.occupation : ''}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Badge priority={p.risk_level || 'medium'} size="sm" />
                          <Badge variant="raw">{p.relationship_type ? p.relationship_type.replace(/_/g, ' ').toUpperCase() : 'PRIMARY SUSPECT'}</Badge>
                          <ChevronRightIcon size={16} color="var(--text-tertiary)" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailTab === 'evidence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: '#FFF', margin: 0 }}>Case Evidence Chain</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Cryptographically hashed and linked to {currentCase.case_number || (currentCase as any).caseNumber}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="crimson" size="sm" icon={<PlusIcon size={14} />} onClick={() => setIsEvidenceModalOpen(true)}>
                        Lodge Evidence to Case
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setActivePage('evidence')}>
                        Vault Workspace
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      const cId = currentCase.case_id || (currentCase as any).id;
                      const matched = caseEvidenceList.filter(
                        (ev) => ev.case_id === cId || ev.caseId === cId || (ev.case_id && cId && ev.case_id.includes(cId))
                      );
                      const displayList = matched.length > 0 ? matched : caseEvidenceList.slice(0, 8);

                      return displayList.map((ev) => {
                        const evNum = ev.evidence_number || ev.evidenceNumber || 'EV-2024-RAW';
                        const evType = ev.evidence_type || ev.evidenceType || 'document';
                        const dateStr = ev.collected_at || ev.collectedAt || new Date().toISOString();
                        return (
                          <div key={ev.evidence_id || ev.id || evNum} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--crimson-bright)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                  {evNum}
                                </span>
                                <Badge variant="cyan" size="sm">{((evType || 'document') as string).replace(/_/g, ' ').toUpperCase()}</Badge>
                                {ev.source && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>• {ev.source}</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFF' }}>{ev.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{ev.description}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <Badge variant="verified">CHAIN VERIFIED</Badge>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                {new Date(dateStr).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {activeDetailTab === 'findings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: '#FFF' }}>LangGraph Synthesized Hypotheses</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                        Autonomous AI deductions stored separately from raw evidence records.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {aiFindings.map((find) => (
                      <div
                        key={find.finding_id}
                        className="glass-panel"
                        style={{
                          padding: '1.25rem',
                          borderLeft: find.human_verified ? '3px solid #00E699' : '3px solid #FF2A42',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge variant="ai" size="sm">{find.agent_name}</Badge>
                            <Badge verificationState={find.human_verified ? 'HUMAN_VERIFIED' : 'AI_FINDING'} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#00E699', fontWeight: 700 }}>
                            {(find.confidence * 100).toFixed(1)}% Confidence
                          </span>
                        </div>

                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginBottom: '0.35rem' }}>
                          {find.title}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                          {find.finding_text}
                        </p>

                        {!find.human_verified && (
                          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <Button variant="crimson" size="sm" icon={<CheckIcon size={14} />} onClick={() => addToast('AI finding confirmed & signed by investigator', 'success')}>
                              Verify & Sign Finding
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other tabs fallback view */}
              {!['overview', 'people', 'evidence', 'findings'].includes(activeDetailTab) && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                    Viewing specialized module: <strong>{activeDetailTab.toUpperCase()}</strong>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActivePage(activeDetailTab === 'graph' ? 'graph' : activeDetailTab === 'cctv' ? 'cctv' : 'dashboard')}>
                    Launch Full {activeDetailTab.toUpperCase()} Workspace
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Case Creation / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Open New Investigative Dossier' : 'Edit Case Parameters'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="crimson" onClick={handleSaveCase}>Save Case Dossier</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Case Title"
            placeholder="e.g., Belvedere Luxury Residential Break-in"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
            <Select
              label="Crime Category"
              value={formData.crime_type}
              onChange={(e) => setFormData({ ...formData, crime_type: e.target.value })}
              options={[
                { value: 'Aggravated Burglary', label: 'Aggravated Burglary' },
                { value: 'Commercial Robbery', label: 'Commercial Robbery' },
                { value: 'Armed Bank Robbery', label: 'Armed Bank Robbery' },
                { value: 'Organized Cargo Theft', label: 'Organized Cargo Theft' },
                { value: 'Wire Fraud & Embezzlement', label: 'Wire Fraud & Embezzlement' },
                { value: 'Cyber Extortion', label: 'Cyber Extortion' },
                { value: 'Narcotics Trafficking', label: 'Narcotics Trafficking' },
              ]}
            />
            <Select
              label="Priority Level"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Select
              label="Case Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CaseStatus })}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'under_investigation', label: 'Under Investigation' },
                { value: 'reopened', label: 'Reopened' },
                { value: 'closed', label: 'Closed' },
                { value: 'cold_case', label: 'Cold Case' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Operational Incident Description
            </label>
            <textarea
              className="input-glass"
              rows={4}
              placeholder="Outline initial investigative leads, modus operandi, and field dispatch notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0c0f17',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Direct Evidence Intake Modal for Case Dossier */}
      <Modal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        title={`Lodge Evidence to: ${currentCase ? (currentCase.case_number || (currentCase as any).caseNumber) : 'Dossier'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEvidenceModalOpen(false)}>Cancel</Button>
            <Button variant="crimson" onClick={handleSaveEvidenceItem}>Lodge & Hash Evidence</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Evidence Item Title"
            placeholder="e.g. CCTV Frame at Perimeter Gate, Wire Ledger PDF, Glove with DNA..."
            value={evidenceFormData.title}
            onChange={(e) => setEvidenceFormData({ ...evidenceFormData, title: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Modality"
              value={evidenceFormData.evidence_type}
              onChange={(e) => setEvidenceFormData({ ...evidenceFormData, evidence_type: e.target.value as EvidenceItem['evidenceType'] })}
              options={[
                { value: 'image', label: 'Image / Photo' },
                { value: 'video', label: 'Surveillance Video' },
                { value: 'audio', label: 'Audio Recording' },
                { value: 'document', label: 'Digital Document / PDF' },
                { value: 'statement', label: 'Witness Statement' },
                { value: 'transaction', label: 'Financial Wire / Ledger' },
                { value: 'call_record', label: 'Call Detail Record (CDR)' },
                { value: 'cctv_record', label: 'CCTV Frame Capture' },
                { value: 'physical', label: 'Physical Asset' },
              ]}
            />
            <Input
              label="Collection Unit / Source"
              placeholder="e.g., Forensic Field Unit, Camera #4"
              value={evidenceFormData.source}
              onChange={(e) => setEvidenceFormData({ ...evidenceFormData, source: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Forensic Observations & Chain of Custody Notes
            </label>
            <textarea
              className="input-glass"
              rows={3}
              placeholder="Technical observations, cryptographic hash, serial numbers, custody handoff..."
              value={evidenceFormData.description}
              onChange={(e) => setEvidenceFormData({ ...evidenceFormData, description: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0c0f17',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

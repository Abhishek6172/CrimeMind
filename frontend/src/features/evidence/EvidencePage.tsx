import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { evidenceApi } from '../../services/api/evidenceApi';
import { casesApi } from '../../services/api/casesApi';
import { EvidenceItem, ChainOfCustodyEntry, Case } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Drawer } from '../../components/common/Drawer';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileTextIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  ShieldCheckIcon,
  CpuIcon,
  CameraIcon,
  PhoneIcon,
  CrosshairIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DatabaseIcon,
  FolderIcon,
  UploadIcon,
  AlertTriangleIcon,
} from '../../components/icons/Icons';

export const EvidencePage: React.FC = () => {
  const { navigateTo } = useApp();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<string>('all');

  // Detail Drawer state
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Upload/Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvidenceForm, setNewEvidenceForm] = useState({
    title: '',
    evidenceType: 'document' as EvidenceItem['evidenceType'],
    caseId: '',
    source: '',
    description: '',
    initialCustodian: 'Det. Sarah Vance #4419',
    custodyAction: 'Initial Evidence Collection & Secured In Locker #12',
    fileName: '',
    fileSize: '4.2 MB',
  });

  const loadEvidenceData = async () => {
    setLoading(true);
    try {
      const [evData, caseData] = await Promise.all([
        evidenceApi.getAll(),
        casesApi.getAll(),
      ]);
      setEvidenceList(evData);
      setCases(caseData);
    } catch (err) {
      console.error('Failed to load evidence', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidenceData();
  }, []);

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvidenceForm.title || !newEvidenceForm.caseId) return;

    try {
      const linkedCase = cases.find(c => (c.id && c.id === newEvidenceForm.caseId) || (c.case_id && c.case_id === newEvidenceForm.caseId));
      const caseNum = linkedCase ? (linkedCase.caseNumber || linkedCase.case_number) : 'CASE-2024-UNKNOWN';
      const newEv = await evidenceApi.create({
        caseId: newEvidenceForm.caseId,
        case_id: newEvidenceForm.caseId,
        caseNumber: caseNum,
        case_number: caseNum,
        title: newEvidenceForm.title,
        evidenceType: newEvidenceForm.evidenceType,
        evidence_type: newEvidenceForm.evidenceType,
        source: newEvidenceForm.source || 'Crime Scene Evidence Team',
        description: newEvidenceForm.description,
        fileName: newEvidenceForm.fileName || `${(newEvidenceForm.title || 'evidence').toLowerCase().replace(/\s+/g, '_')}.dat`,
        fileSize: newEvidenceForm.fileSize,
        aiAnalysisStatus: 'in_progress',
        ai_analysis_status: 'in_progress',
        chainOfCustody: [
          {
            timestamp: new Date().toISOString(),
            officerName: newEvidenceForm.initialCustodian,
            badgeNumber: '4419',
            action: newEvidenceForm.custodyAction,
            location: 'Central Vault / Forensics Ingestion',
          },
        ],
        aiConfidence: 0.94,
        confidence: 0.94,
        aiFindings: [
          'Awaiting LangGraph automated extraction pipeline',
          'Multimodal vector ingestion triggered',
          'Cryptographic integrity hash secured in ledger'
        ],
        tags: [newEvidenceForm.evidenceType, 'Newly Ingested'],
      });

      setEvidenceList(prev => [newEv, ...prev]);
      setIsAddModalOpen(false);
      setNewEvidenceForm({
        title: '',
        evidenceType: 'document',
        caseId: '',
        source: '',
        description: '',
        initialCustodian: 'Det. Sarah Vance #4419',
        custodyAction: 'Initial Evidence Collection & Secured In Locker #12',
        fileName: '',
        fileSize: '4.2 MB',
      });
    } catch (err) {
      console.error('Failed to create evidence', err);
    }
  };

  const filteredEvidence = evidenceList.filter(item => {
    const itemNumber = item.evidenceNumber || item.evidence_number || '';
    const itemCaseNumber = item.caseNumber || item.case_number || '';
    const itemTitle = item.title || '';
    const itemSource = item.source || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      itemTitle.toLowerCase().includes(q) ||
      itemNumber.toLowerCase().includes(q) ||
      itemCaseNumber.toLowerCase().includes(q) ||
      itemSource.toLowerCase().includes(q);

    const itemType = item.evidenceType || item.evidence_type || '';
    const matchesType = selectedType === 'all' || itemType === selectedType;

    const itemStatus = item.aiAnalysisStatus || item.ai_analysis_status || '';
    const matchesStatus = selectedStatus === 'all' || itemStatus === selectedStatus;

    const itemCaseId = item.caseId || item.case_id || '';
    const matchesCase = selectedCase === 'all' || itemCaseId === selectedCase;

    return matchesSearch && matchesType && matchesStatus && matchesCase;
  });

  const getEvidenceTypeIcon = (type: EvidenceItem['evidenceType']) => {
    switch (type) {
      case 'image':
      case 'cctv_record':
        return <CameraIcon size={16} color="var(--color-crimson)" />;
      case 'video':
        return <CrosshairIcon size={16} color="var(--color-crimson-bright)" />;
      case 'audio':
      case 'call_record':
        return <PhoneIcon size={16} color="var(--color-warning)" />;
      case 'transaction':
        return <DatabaseIcon size={16} color="var(--color-info)" />;
      case 'document':
      case 'statement':
      default:
        return <FileTextIcon size={16} color="var(--color-text-secondary)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Evidence Repository
            </h1>
            <Badge variant="crimson" pulse>
              {evidenceList.length} Items Vaulted
            </Badge>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0, maxWidth: '640px' }}>
            Cryptographically tracked forensic chain of custody with automated LangGraph multimodal feature extraction.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            icon={<PlusIcon size={16} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Intake Evidence
          </Button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <Card variant="glass" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Input
            placeholder="Search evidence ID, title, source..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon size={16} />}
          />

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--border-radius-md, 6px)',
              padding: '10px 14px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>All Modalities</option>
            <option value="image" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Image & Photo</option>
            <option value="video" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Video Footage</option>
            <option value="audio" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Audio Intercept</option>
            <option value="document" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Digital Document</option>
            <option value="statement" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Witness Statement</option>
            <option value="transaction" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Financial Transaction</option>
            <option value="call_record" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Call Detail Record (CDR)</option>
            <option value="cctv_record" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>CCTV Surveillance Clip</option>
            <option value="physical" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Physical Evidence</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--border-radius-md, 6px)',
              padding: '10px 14px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>All AI Statuses</option>
            <option value="completed" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>AI Completed</option>
            <option value="in_progress" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>AI Processing</option>
            <option value="pending" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Pending Queue</option>
            <option value="flagged" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>Flagged Anomaly</option>
          </select>

          <select
            value={selectedCase}
            onChange={e => setSelectedCase(e.target.value)}
            style={{
              background: '#0c0f17',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--border-radius-md, 6px)',
              padding: '10px 14px',
              color: '#f0f2f8',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>All Associated Cases</option>
            {cases.map(c => {
              const cid = c.id || c.case_id;
              const cnum = c.caseNumber || c.case_number;
              return (
                <option key={cid} value={cid} style={{ backgroundColor: '#0c0f17', color: '#f0f2f8' }}>
                  {cnum} - {(c.title || 'Untitled Case').substring(0, 32)}...
                </option>
              );
            })}
          </select>
        </div>
      </Card>

      {/* Evidence Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} height="220px" borderRadius="12px" />
          ))}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon size={48} color="var(--color-text-muted)" />}
          title="No Evidence Records Found"
          description="Try adjusting your filters or intake a new forensic piece of evidence into the system."
          action={
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              Intake Evidence
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredEvidence.map(item => (
            <Card
              key={item.id}
              variant="interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => setSelectedEvidence(item)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        background: 'rgba(255, 42, 66, 0.08)',
                        border: '1px solid rgba(255, 42, 66, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getEvidenceTypeIcon(item.evidenceType)}
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                      {item.evidenceNumber}
                    </span>
                  </div>

                  <Badge
                    variant={
                      item.aiAnalysisStatus === 'completed'
                        ? 'success'
                        : item.aiAnalysisStatus === 'in_progress'
                        ? 'crimson'
                        : 'default'
                    }
                  >
                    {item.aiAnalysisStatus === 'in_progress' ? 'AI Ingesting' : item.aiAnalysisStatus.toUpperCase()}
                  </Badge>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
                  {item.title}
                </h3>

                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.5',
                    margin: '0 0 14px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.description || 'Forensic intake record without narrative description.'}
                </p>

                {/* Evidence Metadata Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FolderIcon size={12} /> {item.caseNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {item.source}
                  </span>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div
                style={{
                  borderTop: '1px solid var(--color-glass-border)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                  <ShieldCheckIcon size={14} color="var(--color-success)" />
                  <span>{item.chainOfCustody?.length || 1} Custody Records</span>
                </div>

                {item.aiConfidence && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-crimson-bright)' }}>
                    <CpuIcon size={13} />
                    <span style={{ fontWeight: 700 }}>{Math.round(item.aiConfidence * 100)}% match</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Evidence Detail Drawer */}
      <Drawer
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        title={selectedEvidence ? `${selectedEvidence.evidenceNumber} — ${selectedEvidence.title}` : ''}
        size="large"
      >
        {selectedEvidence && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Stat Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Type</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                  {((selectedEvidence.evidenceType || (selectedEvidence as any).evidence_type || 'evidence') as string).replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Linked Case</span>
                <Button
                  variant="ghost"
                  size="small"
                  style={{ padding: '0', height: 'auto', color: 'var(--color-crimson-bright)' }}
                  onClick={() => {
                    setSelectedEvidence(null);
                    navigateTo('case-detail', { caseId: selectedEvidence.caseId });
                  }}
                >
                  {selectedEvidence.caseNumber} <ArrowRightIcon size={12} />
                </Button>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>AI Confidence</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-crimson)' }}>
                  {selectedEvidence.aiConfidence ? `${(selectedEvidence.aiConfidence * 100).toFixed(1)}%` : 'Processing'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Chain Length</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>
                  {selectedEvidence.chainOfCustody?.length || 1} verified checkpoints
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Forensic Summary
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {selectedEvidence.description}
              </p>
            </div>

            {/* AI Generated Findings Box */}
            <div
              style={{
                background: 'rgba(255, 42, 66, 0.04)',
                border: '1px solid rgba(255, 42, 66, 0.2)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CpuIcon size={16} color="var(--color-crimson)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    LangGraph Multimodal Extraction
                  </span>
                </div>
                <Badge variant="crimson">AI FINDING</Badge>
              </div>

              {selectedEvidence.aiFindings && selectedEvidence.aiFindings.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedEvidence.aiFindings.map((finding, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
                      {finding}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Automated feature extraction currently pending LangGraph model execution.
                </p>
              )}
            </div>

            {/* Chain of Custody Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', margin: 0 }}>
                  Chain of Custody (Cryptographic Audit Log)
                </h4>
                <Badge variant="success">HUMAN VERIFIED</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '2px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px', marginLeft: '6px' }}>
                {selectedEvidence.chainOfCustody && selectedEvidence.chainOfCustody.length > 0 ? (
                  selectedEvidence.chainOfCustody.map((entry, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '-23px',
                          top: '2px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: 'var(--color-success)',
                          border: '2px solid var(--color-bg-base)',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {entry.action}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Custodian: <span style={{ color: 'var(--color-text-primary)' }}>{entry.officerName}</span> (Badge #{entry.badgeNumber}) — Location: {entry.location}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Initial intake recorded.</p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-glass-border)' }}>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedEvidence(null);
                  navigateTo('relationship-graph', { caseId: selectedEvidence.caseId });
                }}
              >
                Inspect in Relationship Graph
              </Button>
              <Button variant="secondary" onClick={() => setSelectedEvidence(null)}>
                Close Panel
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Intake Evidence Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Intake Forensic Evidence"
        subtitle="Upload digital artifacts or log real-world evidence into the cryptographic vault"
      >
        <form onSubmit={handleAddEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Evidence Title / Label *
            </label>
            <Input
              placeholder="e.g. Sub-Level Vault Keycard Logs, CCTV Drive #9"
              value={newEvidenceForm.title}
              onChange={e => setNewEvidenceForm({ ...newEvidenceForm, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Evidence Modality *
              </label>
              <select
                value={newEvidenceForm.evidenceType}
                onChange={e =>
                  setNewEvidenceForm({
                    ...newEvidenceForm,
                    evidenceType: e.target.value as EvidenceItem['evidenceType'],
                  })
                }
                style={{
                  width: '100%',
                  background: '#0c0f17',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '10px 14px',
                  color: '#f0f2f8',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="image" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Image / Photo</option>
                <option value="video" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Surveillance Video</option>
                <option value="audio" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Audio Recording</option>
                <option value="document" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Digital Document / PDF</option>
                <option value="statement" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Witness Statement</option>
                <option value="transaction" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Financial Wire / Ledger</option>
                <option value="call_record" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Call Detail Record (CDR)</option>
                <option value="cctv_record" style={{ background: '#0c0f17', color: '#f0f2f8' }}>CCTV Frame Capture</option>
                <option value="physical" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Physical Asset</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Associated Case File *
              </label>
              <select
                value={newEvidenceForm.caseId}
                onChange={e => setNewEvidenceForm({ ...newEvidenceForm, caseId: e.target.value })}
                required
                style={{
                  width: '100%',
                  background: '#0c0f17',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '10px 14px',
                  color: '#f0f2f8',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="" style={{ background: '#0c0f17', color: '#f0f2f8' }}>Select Case File...</option>
                {cases.map((c: any) => {
                  const cId = c.id || c.case_id;
                  const cNum = c.caseNumber || c.case_number;
                  return (
                    <option key={cId} value={cId} style={{ background: '#0c0f17', color: '#f0f2f8' }}>
                      {cNum} - {c.title}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Collection Source / Ingestion Origin
            </label>
            <Input
              placeholder="e.g. Metro Terminal Cam #04, Field Tech Det. Vance"
              value={newEvidenceForm.source}
              onChange={e => setNewEvidenceForm({ ...newEvidenceForm, source: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Description & Context
            </label>
            <textarea
              rows={3}
              placeholder="Provide narrative context of where and how the evidence was secured..."
              value={newEvidenceForm.description}
              onChange={e => setNewEvidenceForm({ ...newEvidenceForm, description: e.target.value })}
              style={{
                width: '100%',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: 'var(--border-radius-md)',
                padding: '10px 14px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Upload Simulation Area */}
          <div
            style={{
              border: '2px dashed rgba(255, 42, 66, 0.3)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(255, 42, 66, 0.02)',
              cursor: 'pointer',
            }}
            onClick={() => {
              setNewEvidenceForm({
                ...newEvidenceForm,
                fileName: `evidence_artifact_${Date.now().toString().slice(-4)}.bin`,
              });
            }}
          >
            <UploadIcon size={32} color="var(--color-crimson)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {newEvidenceForm.fileName ? `Selected: ${newEvidenceForm.fileName}` : 'Click or drop files to upload'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Accepts MP4, WAV, PDF, JPG, PNG, CSV, JSON (Encrypted AES-256 upon intake)
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!newEvidenceForm.title || !newEvidenceForm.caseId}>
              Complete Ingestion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

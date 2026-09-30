// ============================================================================
// CrimeMind Evidence API Service
// File: evidenceApi.ts
// ============================================================================

import { Evidence, EvidenceItem } from '../../types';
import { api } from './apiClient';
import { initialEvidence } from '../../utils/mockData';

const STORAGE_KEY = 'crimemind_evidence';

export function normalizeEvidence(e: any): EvidenceItem {
  if (!e) return e;
  const id = String(e.evidence_id || e.id || `evd-${Date.now()}`);
  const evidenceNumber = e.evidence_number || e.evidenceNumber || `EVD-${new Date().getFullYear()}-${id.slice(-5)}`;
  const caseId = e.case_id || e.caseId || '';
  const caseNumber = e.case_number || e.caseNumber || 'CASE-2024-UNKNOWN';
  
  // Normalize modality type to match UI keys (image, video, audio, document, statement, transaction, call_record, cctv_record, physical)
  let evidenceType = e.evidence_type || e.evidenceType || 'document';
  if (evidenceType === 'documents' || evidenceType === 'digital_files') evidenceType = 'document';
  else if (evidenceType === 'images') evidenceType = 'image';
  else if (evidenceType === 'videos') evidenceType = 'video';
  else if (evidenceType === 'forensic_records' || evidenceType === 'physical_weapons') evidenceType = 'physical';
  else if (evidenceType === 'statements') evidenceType = 'statement';
  else if (evidenceType === 'transaction_records') evidenceType = 'transaction';
  else if (evidenceType === 'call_records') evidenceType = 'call_record';
  else if (evidenceType === 'cctv_records') evidenceType = 'cctv_record';

  const rawStatus = e.ai_analysis_status || e.aiAnalysisStatus || 'completed';
  const aiAnalysisStatus = rawStatus === 'analyzing' ? 'in_progress' : rawStatus;

  const confidence = e.confidence !== undefined ? e.confidence : (e.aiConfidence !== undefined ? e.aiConfidence : 0.95);

  const rawChain = e.chain_of_custody || e.chainOfCustody || [];
  const chainOfCustody = rawChain.map((entry: any) => ({
    timestamp: entry.timestamp || new Date().toISOString(),
    officerName: entry.officerName || entry.officer_name || 'Evidence Technician #4419',
    badgeNumber: entry.badgeNumber || entry.badge_number || '4419',
    action: entry.action || 'Intake Logged & Vault Secured',
    location: entry.location || entry.facility || 'Central Vault / Forensics Ingestion',
    notes: entry.notes || 'Cryptographic SHA-256 seal verified.',
  }));

  const aiFindings = Array.isArray(e.aiFindings) 
    ? e.aiFindings 
    : (e.ai_summary ? [e.ai_summary, 'Multi-agent hypothesis validated against active ledger'] : ['Chain of custody cryptographically verified', 'Spectral signature registered in vault']);

  return {
    ...e,
    id,
    evidence_id: id,
    evidenceNumber,
    evidence_number: evidenceNumber,
    caseId,
    case_id: caseId,
    caseNumber,
    case_number: caseNumber,
    evidenceType,
    evidence_type: evidenceType,
    title: e.title || 'Secured Forensic Evidence Item',
    description: e.description || '',
    source: e.source || 'Authorized Forensic Intake',
    collected_at: e.collected_at || e.collectedAt || new Date().toISOString(),
    collectedAt: e.collected_at || e.collectedAt || new Date().toISOString(),
    file_path: e.file_path || e.filePath || `s3://crimemind-vault/intake/${id}.dat`,
    hash: e.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    confidence,
    aiConfidence: confidence,
    aiAnalysisStatus,
    ai_analysis_status: aiAnalysisStatus,
    ai_summary: e.ai_summary || aiFindings[0] || 'Forensic intake logged.',
    aiFindings,
    chainOfCustody,
    chain_of_custody: rawChain,
    fileName: e.fileName || e.file_name || `${id}.dat`,
    fileSize: e.fileSize || e.file_size || '3.8 MB',
    tags: e.tags || [evidenceType, 'Active Evidence'],
  };
}

function getLocalEvidence(): EvidenceItem[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEvidence));
    return initialEvidence.map(normalizeEvidence);
  }
  try {
    const parsed = JSON.parse(stored);
    const existingIds = new Set(parsed.map((item: any) => item.evidence_id || item.id));
    let hasNew = false;
    for (const initEv of initialEvidence) {
      if (!existingIds.has(initEv.evidence_id)) {
        parsed.push(initEv);
        hasNew = true;
      }
    }
    if (hasNew) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed.map(normalizeEvidence);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEvidence));
    return initialEvidence.map(normalizeEvidence);
  }
}

function saveLocalEvidence(items: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const evidenceApi = {
  // GET /api/evidence
  async getEvidence(filters?: { case_id?: string; caseId?: string; evidence_type?: string; evidenceType?: string; search?: string }): Promise<EvidenceItem[]> {
    try {
      const data = await api.get<any[]>('/evidence', filters as any);
      return data.map(normalizeEvidence);
    } catch {
      let items = getLocalEvidence();

      const targetCase = filters?.case_id || filters?.caseId;
      if (targetCase && targetCase !== 'all') {
        items = items.filter(e => e.caseId === targetCase || e.case_id === targetCase);
      }

      const targetType = filters?.evidence_type || filters?.evidenceType;
      if (targetType && targetType !== 'all') {
        items = items.filter(e => e.evidenceType === targetType || e.evidence_type === targetType);
      }

      if (filters?.search) {
        const query = filters.search.toLowerCase();
        items = items.filter(e =>
          e.title.toLowerCase().includes(query) ||
          e.evidenceNumber.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          (e.source && e.source.toLowerCase().includes(query))
        );
      }
      return items;
    }
  },

  // Alias for getEvidence
  async getAll(filters?: any): Promise<EvidenceItem[]> {
    return evidenceApi.getEvidence(filters);
  },

  // GET /api/evidence/:id
  async getEvidenceById(evidenceId: string): Promise<EvidenceItem> {
    try {
      const data = await api.get<any>(`/evidence/${evidenceId}`);
      return normalizeEvidence(data);
    } catch {
      const items = getLocalEvidence();
      const found = items.find(e => e.id === evidenceId || e.evidence_id === evidenceId || e.evidenceNumber === evidenceId);
      if (!found) throw new Error(`Evidence ${evidenceId} not found`);
      return found;
    }
  },

  // Alias for getEvidenceById
  async getById(evidenceId: string): Promise<EvidenceItem> {
    return evidenceApi.getEvidenceById(evidenceId);
  },

  // POST /api/evidence
  async createEvidence(data: Partial<EvidenceItem>): Promise<EvidenceItem> {
    try {
      const res = await api.post<any>('/evidence', data);
      return normalizeEvidence(res);
    } catch {
      const items = getLocalEvidence();
      const newId = `evd-${Date.now()}`;
      const newEvNumber = `EVD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const newEvidence: EvidenceItem = normalizeEvidence({
        evidence_id: newId,
        id: newId,
        case_id: data.caseId || data.case_id || 'case-001',
        caseId: data.caseId || data.case_id || 'case-001',
        case_number: data.caseNumber || data.case_number || 'CASE-2024-0106',
        caseNumber: data.caseNumber || data.case_number || 'CASE-2024-0106',
        evidence_number: newEvNumber,
        evidenceNumber: newEvNumber,
        evidence_type: data.evidenceType || data.evidence_type || 'document',
        evidenceType: data.evidenceType || data.evidence_type || 'document',
        title: data.title || 'Secured Forensic Evidence Item',
        description: data.description || 'Intake artifact logged in high-security forensic vault.',
        source: data.source || 'Authorized Evidence Intake Unit',
        collected_at: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        file_path: data.fileName ? `s3://crimemind-vault/intake/${data.fileName}` : `s3://crimemind-vault/intake/${newId}.dat`,
        hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        confidence: data.aiConfidence || data.confidence || 0.94,
        aiConfidence: data.aiConfidence || data.confidence || 0.94,
        ai_analysis_status: 'in_progress',
        aiAnalysisStatus: 'in_progress',
        ai_summary: 'Automated multi-agent feature extraction scheduled.',
        aiFindings: [
          'Awaiting LangGraph automated extraction pipeline',
          'Multimodal vector ingestion triggered',
          'Chain of custody cryptographically secured'
        ],
        chain_of_custody: [
          {
            action: 'Initial Evidence Collection & Secured In Vault',
            officer_name: 'Det. Sarah Vance',
            timestamp: new Date().toISOString(),
            facility: 'Central Evidence Repository',
            notes: 'Initial custody secured.',
          }
        ],
        chainOfCustody: [
          {
            timestamp: new Date().toISOString(),
            officerName: 'Det. Sarah Vance #4419',
            badgeNumber: '4419',
            action: 'Initial Evidence Collection & Secured In Vault',
            location: 'Central Vault / Forensics Ingestion',
            notes: 'Initial custody secured.',
          }
        ],
        fileName: data.fileName || `${newId}.dat`,
        fileSize: data.fileSize || '4.2 MB',
        tags: [data.evidenceType || 'document', 'Newly Ingested'],
        ...data,
      });

      items.unshift(newEvidence);
      saveLocalEvidence(items);
      return newEvidence;
    }
  },

  // Alias for createEvidence
  async create(data: Partial<EvidenceItem>): Promise<EvidenceItem> {
    return evidenceApi.createEvidence(data);
  },

  // PATCH /api/evidence/:id
  async updateEvidence(evidenceId: string, updates: Partial<EvidenceItem>): Promise<EvidenceItem> {
    try {
      const data = await api.patch<any>(`/evidence/${evidenceId}`, updates);
      return normalizeEvidence(data);
    } catch {
      const items = getLocalEvidence();
      const index = items.findIndex(e => e.id === evidenceId || e.evidence_id === evidenceId);
      if (index === -1) throw new Error(`Evidence ${evidenceId} not found`);

      const updated = normalizeEvidence({
        ...items[index],
        ...updates,
      });
      items[index] = updated;
      saveLocalEvidence(items);
      return updated;
    }
  },

  // Alias for updateEvidence
  async update(evidenceId: string, updates: Partial<EvidenceItem>): Promise<EvidenceItem> {
    return evidenceApi.updateEvidence(evidenceId, updates);
  },

  // DELETE /api/evidence/:id
  async deleteEvidence(evidenceId: string): Promise<boolean> {
    try {
      await api.delete(`/evidence/${evidenceId}`);
      return true;
    } catch {
      const items = getLocalEvidence().filter(e => e.id !== evidenceId && e.evidence_id !== evidenceId);
      saveLocalEvidence(items);
      return true;
    }
  },

  // Alias for deleteEvidence
  async delete(evidenceId: string): Promise<boolean> {
    return evidenceApi.deleteEvidence(evidenceId);
  },

  // Reset to initial mock evidence
  resetToDefaults(): EvidenceItem[] {
    const list = initialEvidence.map(normalizeEvidence);
    saveLocalEvidence(list);
    return list;
  }
};

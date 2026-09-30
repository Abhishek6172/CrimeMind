// ============================================================================
// CrimeMind Cases API Service
// File: casesApi.ts
// ============================================================================

import { Case, TimelineEvent, CasePerson } from '../../types';
import { api } from './apiClient';
import { initialCases } from '../../utils/mockData';

const STORAGE_KEY = 'crimemind_cases';

export function normalizeCase(c: any): any {
  if (!c) return c;
  const id = String(c.case_id || c.id || `case-${Date.now()}`);
  const caseNumber = c.case_number || c.caseNumber || `CASE-2024-${id.slice(-4)}`;
  return {
    ...c,
    id,
    case_id: id,
    caseNumber,
    case_number: caseNumber,
    status: c.status || 'open',
    priority: c.priority || 'medium',
    crime_type: c.crime_type || c.crimeType || 'General Investigation',
    crimeType: c.crime_type || c.crimeType || 'General Investigation',
    opened_at: c.opened_at || c.openedAt || new Date().toISOString(),
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  };
}

function getLocalCases(): Case[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCases));
    return initialCases.map(normalizeCase);
  }
  try {
    const parsed = JSON.parse(stored);
    // Ensure all seed cases from initialCases are present in stored cases
    const existingIds = new Set(parsed.map((c: any) => c.case_id || c.id));
    let hasNew = false;
    for (const initCase of initialCases) {
      if (!existingIds.has(initCase.case_id)) {
        parsed.push(initCase);
        hasNew = true;
      }
    }
    if (hasNew) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed.map(normalizeCase);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCases));
    return initialCases.map(normalizeCase);
  }
}

function saveLocalCases(cases: Case[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

export const casesApi = {
  // GET /api/cases
  async getCases(filters?: { status?: string; priority?: string; crime_type?: string; search?: string }): Promise<Case[]> {
    try {
      const data = await api.get<Case[]>('/cases', filters);
      return data.map(normalizeCase);
    } catch {
      let cases = getLocalCases();

      if (filters?.status && filters.status !== 'all') {
        cases = cases.filter(c => c.status === filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        cases = cases.filter(c => c.priority === filters.priority);
      }
      if (filters?.crime_type && filters.crime_type !== 'all') {
        cases = cases.filter(c => c.crime_type === filters.crime_type);
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        cases = cases.filter(c => 
          c.title.toLowerCase().includes(query) ||
          c.case_number.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query)
        );
      }
      return cases;
    }
  },

  // Alias for getCases
  async getAll(filters?: { status?: string; priority?: string; crime_type?: string; search?: string }): Promise<Case[]> {
    return casesApi.getCases(filters);
  },

  // GET /api/cases/:id
  async getCaseById(caseId: string): Promise<Case> {
    try {
      const data = await api.get<Case>(`/cases/${caseId}`);
      return normalizeCase(data);
    } catch {
      const cases = getLocalCases();
      const found = cases.find(c => c.case_id === caseId || (c as any).id === caseId || c.case_number === caseId);
      if (!found) throw new Error(`Case ${caseId} not found`);
      return found;
    }
  },

  // Alias for getCaseById
  async getById(caseId: string): Promise<Case> {
    return casesApi.getCaseById(caseId);
  },

  // POST /api/cases
  async createCase(caseData: Partial<Case>): Promise<Case> {
    try {
      const data = await api.post<Case>('/cases', caseData);
      return normalizeCase(data);
    } catch {
      const cases = getLocalCases();
      const newCaseId = `case-${Date.now()}`;
      const newCaseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newCase: Case = normalizeCase({
        case_id: newCaseId,
        id: newCaseId,
        case_number: newCaseNumber,
        caseNumber: newCaseNumber,
        title: caseData.title || 'Untitled Case File',
        description: caseData.description || 'Intake lead record logged in central register.',
        status: caseData.status || 'open',
        priority: caseData.priority || 'medium',
        crime_type: caseData.crime_type || (caseData as any).crimeType || 'General Investigation',
        investigating_officer_id: caseData.investigating_officer_id || 'usr-101',
        investigating_officer_name: caseData.investigating_officer_name || 'Det. Sarah Vance',
        primary_location_id: caseData.primary_location_id || 'loc-001',
        primary_location_name: caseData.primary_location_name || 'Metropolis Central',
        primary_city: 'Metropolis Central',
        opened_at: new Date().toISOString(),
        suspect_count: 0,
        victim_count: 0,
        evidence_count: 0,
        ai_finding_count: 0,
        unverified_ai_finding_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...caseData,
      });

      cases.unshift(newCase);
      saveLocalCases(cases);
      return newCase;
    }
  },

  // Alias for createCase
  async create(caseData: Partial<Case>): Promise<Case> {
    return casesApi.createCase(caseData);
  },

  // PATCH /api/cases/:id
  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    try {
      const data = await api.patch<Case>(`/cases/${caseId}`, updates);
      return normalizeCase(data);
    } catch {
      const cases = getLocalCases();
      const index = cases.findIndex(c => c.case_id === caseId || (c as any).id === caseId);
      if (index === -1) throw new Error(`Case ${caseId} not found`);

      const updated = normalizeCase({
        ...cases[index],
        ...updates,
        updated_at: new Date().toISOString(),
      });
      cases[index] = updated;
      saveLocalCases(cases);
      return updated;
    }
  },

  // Alias for updateCase
  async update(caseId: string, updates: Partial<Case>): Promise<Case> {
    return casesApi.updateCase(caseId, updates);
  },

  // DELETE /api/cases/:id
  async deleteCase(caseId: string): Promise<boolean> {
    try {
      await api.delete(`/cases/${caseId}`);
      return true;
    } catch {
      const cases = getLocalCases().filter(c => c.case_id !== caseId && (c as any).id !== caseId);
      saveLocalCases(cases);
      return true;
    }
  },

  // Alias for deleteCase
  async delete(caseId: string): Promise<boolean> {
    return casesApi.deleteCase(caseId);
  },

  // Reset to default synthetic cases
  resetToDefaults(): Case[] {
    const list = initialCases.map(normalizeCase);
    saveLocalCases(list);
    return list;
  },

  // GET /api/timeline/:caseId
  async getCaseTimeline(caseId: string): Promise<TimelineEvent[]> {
    try {
      return await api.get<TimelineEvent[]>(`/timeline/${caseId}`);
    } catch {
      return [
        {
          event_id: 'ev-1',
          case_id: caseId,
          event_timestamp: '2024-05-14T01:50:00Z',
          event_type: 'cell_tower_ping',
          description: 'Cell tower ping TOW-DT-882 logged near First National Bank District.',
          source: 'Telecom Provider Subpoena',
          verification_status: 'RAW_DATA',
        },
        {
          event_id: 'ev-2',
          case_id: caseId,
          event_timestamp: '2024-05-14T02:00:00Z',
          event_type: 'cctv_sighting',
          description: 'Surveillance Camera CAM-BK-003 detected subject Trevor Bennett outside rear vault corridor.',
          source: 'Municipal CCTV Automated Video Pipeline',
          verification_status: 'AI_FINDING',
        },
        {
          event_id: 'ev-3',
          case_id: caseId,
          event_timestamp: '2024-05-14T02:45:00Z',
          event_type: 'crime_committed',
          description: 'Silent ultrasonic vibration alarm tripped on branch vault door.',
          source: 'Central Dispatch 911',
          verification_status: 'RAW_DATA',
        },
        {
          event_id: 'ev-4',
          case_id: caseId,
          event_timestamp: '2024-05-14T03:05:00Z',
          event_type: 'evidence_seized',
          description: 'Optical drill bit and battery pack recovered from scene by CSU.',
          source: 'Crime Scene Unit',
          verification_status: 'HUMAN_VERIFIED',
        }
      ];
    }
  }
};

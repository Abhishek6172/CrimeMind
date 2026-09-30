// ============================================================================
// CrimeMind Persons API Service
// File: personsApi.ts
// ============================================================================

import { Person } from '../../types';
import { api } from './apiClient';
import { initialPersons } from '../../utils/mockData';

const STORAGE_KEY = 'crimemind_persons';

export function normalizePerson(p: any): Person {
  if (!p) return p;
  const id = String(p.id || p.person_id || 'per-001');
  const fullName = p.fullName || p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Subject';
  const rawRisk = (p.risk_level || p.threatLevel || 'high').toString();
  const threatLevel = p.threatLevel || rawRisk.toUpperCase();
  const risk_level = rawRisk.toLowerCase() as any;
  const status = p.status || (p.cases_as_suspect && p.cases_as_suspect > 0 ? 'suspect' : 'person_of_interest');
  
  const linkedCases = p.linkedCases && p.linkedCases.length > 0
    ? p.linkedCases
    : (p.cases_as_suspect ? ['case-001', 'case-002'] : ['case-001']);
  
  const knownAssociates = p.knownAssociates && p.knownAssociates.length > 0
    ? p.knownAssociates
    : [
        { name: 'Julian Drake', relationship: 'CO-CONSPIRATOR' },
        { name: 'Evelyn Reed', relationship: 'BROKER / NEXUS' }
      ];

  const vehicles = p.vehicles && p.vehicles.length > 0
    ? p.vehicles
    : [
        { make: 'Dodge', model: 'Charger', year: 2021, licensePlate: 'SYN-7X91', color: 'Dark Gray' }
      ];

  const aiFindings = p.aiFindings && p.aiFindings.length > 0
    ? p.aiFindings
    : [
        `Associated with ${p.total_cases_associated || 4} high-profile metropolitan incidents.`,
        `Cellular ping density matches 12 known syndicate drop locations.`,
        `LangGraph Pattern Agent scored identity with 96.8% risk index.`
      ];

  return {
    ...p,
    id,
    person_id: id,
    fullName,
    full_name: fullName,
    threatLevel,
    risk_level,
    status,
    aliases: p.aliases || [],
    linkedCases,
    knownAssociates,
    vehicles,
    aiFindings,
    nationality: p.nationality || 'United States',
    dateOfBirth: p.dateOfBirth || p.date_of_birth || `${p.age || 38} years old`,
    gangAffiliation: p.gangAffiliation || (p.risk_indicators?.[0]?.replace(/_/g, ' ') || 'Midnight Syndicate'),
  };
}

function getLocalPersons(): Person[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPersons));
    return initialPersons.map(normalizePerson);
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizePerson) : initialPersons.map(normalizePerson);
  } catch {
    return initialPersons.map(normalizePerson);
  }
}

export const personsApi = {
  // GET /api/persons
  async getPersons(filters?: { risk_level?: string; search?: string }): Promise<Person[]> {
    try {
      const data = await api.get<Person[]>('/persons', filters);
      return data.map(normalizePerson);
    } catch {
      let persons = getLocalPersons();

      if (filters?.risk_level && filters.risk_level !== 'all') {
        persons = persons.filter(p => p.risk_level === filters.risk_level);
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        persons = persons.filter(p =>
          (p.full_name || p.fullName || '').toLowerCase().includes(query) ||
          (p.aliases || []).some(a => a.toLowerCase().includes(query)) ||
          (p.national_id_synthetic || '').toLowerCase().includes(query) ||
          (p.occupation || '').toLowerCase().includes(query)
        );
      }
      return persons.map(normalizePerson);
    }
  },

  // Alias for getPersons
  async getAll(filters?: { risk_level?: string; search?: string }): Promise<Person[]> {
    return personsApi.getPersons(filters);
  },

  // GET /api/persons/:id
  async getPersonById(personId: string): Promise<Person> {
    try {
      const data = await api.get<Person>(`/persons/${personId}`);
      return normalizePerson(data);
    } catch {
      const persons = getLocalPersons();
      const pId = String(personId || '').toLowerCase();
      const found = persons.find(p =>
        p.person_id?.toLowerCase() === pId ||
        p.id?.toLowerCase() === pId ||
        (p.full_name || p.fullName || '').toLowerCase() === pId
      );
      if (!found) {
        return normalizePerson(persons[0]);
      }
      return normalizePerson(found);
    }
  },

  // Alias for getPersonById
  async getById(personId: string): Promise<Person> {
    return personsApi.getPersonById(personId);
  }
};

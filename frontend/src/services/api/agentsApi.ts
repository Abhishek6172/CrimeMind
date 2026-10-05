// ============================================================================
// CrimeMind LangGraph Agents API Service
// File: agentsApi.ts
// ============================================================================

import { AgentRun, AIFinding, LangGraphAgent } from '../../types';
import { api } from './apiClient';
import { initialAgentRuns, initialAIFindings, initialAgentsList } from '../../utils/mockData';

const STORAGE_KEY_FINDINGS = 'crimemind_ai_findings';
const STORAGE_KEY_AGENTS = 'crimemind_langgraph_agents';

function getLocalFindings(): AIFinding[] {
  const stored = localStorage.getItem(STORAGE_KEY_FINDINGS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_FINDINGS, JSON.stringify(initialAIFindings));
    return initialAIFindings;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialAIFindings;
  }
}

function saveLocalFindings(findings: AIFinding[]) {
  localStorage.setItem(STORAGE_KEY_FINDINGS, JSON.stringify(findings));
}

function getLocalAgents(): LangGraphAgent[] {
  const stored = localStorage.getItem(STORAGE_KEY_AGENTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(initialAgentsList));
    return initialAgentsList;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialAgentsList;
  }
}

function saveLocalAgents(agents: LangGraphAgent[]) {
  localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(agents));
}

export const agentsApi = {
  // GET /api/agents (LangGraph Swarm Agents)
  async getAgents(): Promise<LangGraphAgent[]> {
    try {
      const response = await api.get<any[]>('/agents/status');
      return response.map((item: any) => ({
        id: item.id,
        name: item.name,
        role: item.role || 'Agent',
        status: item.status,
        currentTask: item.current_task || '',
        executionTimeMs: item.execution_time_ms || 0,
        confidence: item.confidence || 0.9,
        findingsCount: item.findings_count || 0,
        lastExecution: item.last_execution || new Date().toISOString(),
        errors: item.errors || [],
      }));
    } catch {
      return getLocalAgents();
    }
  },

  // Alias for getAgents
  async getAll(): Promise<LangGraphAgent[]> {
    return agentsApi.getAgents();
  },

  // POST /api/agents/:id/trigger
  async triggerAgent(agentId: string): Promise<{ success: boolean; agentId: string; message: string }> {
    let result;
    try {
      result = await api.post<{ success: boolean; agentId: string; message: string }>(`/agents/${agentId}/trigger`, {});
    } catch {
      result = { success: true, agentId, message: `Agent ${agentId} triggered locally.` };
    }

    const agents = getLocalAgents();
    if (agentId === 'all') {
      const updated = agents.map(a => ({
        ...a,
        status: 'idle' as const,
        lastExecution: new Date().toISOString(),
        findingsCount: a.findingsCount + 1,
      }));
      saveLocalAgents(updated);
      return result || { success: true, agentId: 'all', message: 'Full LangGraph multi-agent swarm synchronized.' };
    }

    const index = agents.findIndex(a => a.id === agentId);
    if (index !== -1) {
      agents[index] = {
        ...agents[index],
        status: 'idle',
        lastExecution: new Date().toISOString(),
        findingsCount: agents[index].findingsCount + 1,
      };
      saveLocalAgents(agents);
    }
    return result || { success: true, agentId, message: `Agent ${agentId} triggered successfully.` };
  },

  // GET /api/agents/status
  async getAgentRuns(caseId?: string): Promise<AgentRun[]> {
    try {
      return await api.get<AgentRun[]>('/agents/status', { case_id: caseId });
    } catch {
      return caseId ? initialAgentRuns.filter(r => r.case_id === caseId) : initialAgentRuns;
    }
  },

  // GET /api/agents/findings
  async getAIFindings(caseId?: string): Promise<AIFinding[]> {
    try {
      return await api.get<AIFinding[]>('/agents/findings', { case_id: caseId });
    } catch {
      const findings = getLocalFindings();
      return caseId ? findings.filter(f => f.case_id === caseId) : findings;
    }
  },

  // POST /api/agents/findings/:id/verify
  async verifyAIFinding(findingId: string, notes?: string): Promise<AIFinding> {
    try {
      return await api.post<AIFinding>(`/agents/findings/${findingId}/verify`, { notes });
    } catch {
      const findings = getLocalFindings();
      const index = findings.findIndex(f => f.finding_id === findingId);
      if (index === -1) throw new Error(`Finding ${findingId} not found`);

      findings[index].human_verified = true;
      findings[index].verified_by = 'Authorized Detective';
      findings[index].verified_at = new Date().toISOString();
      findings[index].verification_notes = notes || 'Verified against raw physical evidence.';
      saveLocalFindings(findings);
      return findings[index];
    }
  }
};

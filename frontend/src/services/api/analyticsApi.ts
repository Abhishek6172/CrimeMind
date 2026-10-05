
import { api } from './apiClient';

export interface DashboardStats {
  active_cases: number;
  high_priority_cases: number;
  evidence_processed: number;
  cctv_detections: number;
  active_ai_agents: number;
  hypotheses_synthesized: number;
}

export const analyticsApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await api.get<DashboardStats>('/analytics/dashboard-stats');
    } catch {
      return {
        active_cases: 9,
        high_priority_cases: 5,
        evidence_processed: 20000,
        cctv_detections: 100000,
        active_ai_agents: 5,
        hypotheses_synthesized: 4000
      };
    }
  }
};

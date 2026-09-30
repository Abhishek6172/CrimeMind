// ============================================================================
// CrimeMind Alerts API Service
// File: alertsApi.ts
// ============================================================================

import { Alert } from '../../types';
import { api } from './apiClient';
import { initialAlerts } from '../../utils/mockData';

const STORAGE_KEY = 'crimemind_alerts';

function getLocalAlerts(): Alert[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAlerts));
    return initialAlerts;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialAlerts;
  }
}

function saveLocalAlerts(alerts: Alert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export const alertsApi = {
  // GET /api/alerts
  async getAlerts(filters?: { severity?: string; unacknowledged_only?: boolean }): Promise<Alert[]> {
    try {
      return await api.get<Alert[]>('/alerts', filters);
    } catch {
      let alerts = getLocalAlerts();
      if (filters?.severity && filters.severity !== 'all') {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters?.unacknowledged_only) {
        alerts = alerts.filter(a => !a.is_acknowledged);
      }
      return alerts;
    }
  },

  // Alias for getAlerts
  async getAll(filters?: { severity?: string; unacknowledged_only?: boolean }): Promise<Alert[]> {
    return alertsApi.getAlerts(filters);
  },

  // POST /api/alerts/:id/acknowledge
  async acknowledgeAlert(alertId: string): Promise<Alert> {
    try {
      return await api.post<Alert>(`/alerts/${alertId}/acknowledge`);
    } catch {
      const alerts = getLocalAlerts();
      const index = alerts.findIndex(a => a.alert_id === alertId);
      if (index === -1) throw new Error(`Alert ${alertId} not found`);

      alerts[index].is_acknowledged = true;
      saveLocalAlerts(alerts);
      return alerts[index];
    }
  },

  // Alias for acknowledgeAlert
  async acknowledge(alertId: string): Promise<Alert> {
    return alertsApi.acknowledgeAlert(alertId);
  }
};

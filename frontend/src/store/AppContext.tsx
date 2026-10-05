import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case, Alert } from '../types';
import { casesApi } from '../services/api/casesApi';
import { alertsApi } from '../services/api/alertsApi';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface NavigationParams {
  caseId?: string;
  personId?: string;
}

interface AppContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  navigateTo: (page: string, params?: NavigationParams) => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
  currentCaseId: string | null;
  setCurrentCaseId: (id: string | null) => void;
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  currentPersonId: string | null;
  setCurrentPersonId: (id: string | null) => void;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  cases: Case[];
  refreshCases: () => Promise<void>;
  alerts: Alert[];
  unreadAlertCount: number;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<string>('landing');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('crimemind_theme') as 'dark' | 'light') || 'dark';
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crimemind_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const navigateTo = (page: string, params?: NavigationParams) => {
    setActivePage(page);
    if (params?.caseId !== undefined) {
      setSelectedCaseId(params.caseId);
    }
    if (params?.personId !== undefined) {
      setSelectedPersonId(params.personId);
    }
  };

  const refreshCases = async () => {
    try {
      const data = await casesApi.getCases();
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases', err);
    }
  };

  const refreshAlerts = async () => {
    try {
      const data = await alertsApi.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    }
  };

  useEffect(() => {
    refreshCases();
    refreshAlerts();
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await alertsApi.acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, is_acknowledged: true } : a));
      addToast('Alert marked as acknowledged', 'info');
    } catch (err) {
      console.error('Failed to acknowledge alert', err);
    }
  };

  const unreadAlertCount = alerts.filter(a => !a.is_acknowledged).length;

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        currentRoute: activePage,
        setCurrentRoute: setActivePage,
        navigateTo,
        selectedCaseId,
        setSelectedCaseId,
        currentCaseId: selectedCaseId,
        setCurrentCaseId: setSelectedCaseId,
        selectedPersonId,
        setSelectedPersonId,
        currentPersonId: selectedPersonId,
        setCurrentPersonId: setSelectedPersonId,
        isAssistantOpen,
        setIsAssistantOpen,
        theme,
        toggleTheme,
        cases,
        refreshCases,
        alerts,
        unreadAlertCount,
        acknowledgeAlert,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

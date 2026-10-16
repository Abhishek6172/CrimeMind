import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Case, Alert, User, AuthTokenResponse, GooglePublicConfig } from '../types';
import { casesApi } from '../services/api/casesApi';
import { alertsApi } from '../services/api/alertsApi';
import { authApi } from '../services/api/authApi';

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

  // Authentication State & Actions
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  googleConfig: GooglePublicConfig | null;
  login: (username: string, password: string) => Promise<AuthTokenResponse>;
  loginWithGoogle: (credential: string) => Promise<AuthTokenResponse>;
  loginWithGoogleCode: (code: string, state?: string) => Promise<AuthTokenResponse>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '');
      const search = window.location.search;
      if (
        path === 'login' ||
        path === 'login/callback' ||
        path === 'auth/google/callback' ||
        search.includes('code=') ||
        search.includes('error=') ||
        search.includes('auth_error=')
      ) {
        return 'login';
      }
    }
    return 'landing';
  });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('crimemind_theme') as 'dark' | 'light') || 'dark';
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auth state
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('crimemind_user');
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crimemind_token'));
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [googleConfig, setGoogleConfig] = useState<GooglePublicConfig | null>({
    client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '888824302509-u2geafh9b1hn9sob0tp9d8iuai91v83n.apps.googleusercontent.com',
    project_id: 'glass-badge-468110-d1',
    redirect_uri: window.location.origin + '/auth/google/callback',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  });

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

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch Google public configuration from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cfg = await authApi.getGoogleConfig();
        setGoogleConfig(cfg);
      } catch (err) {
        // Fallback already pre-initialized
      }
    };
    fetchConfig();
  }, []);

  // Validate existing session on mount
  useEffect(() => {
    const hydrateSession = async () => {
      const storedToken = localStorage.getItem('crimemind_token');
      if (storedToken) {
        try {
          const profile = await authApi.getCurrentUser();
          setUser(profile);
          localStorage.setItem('crimemind_user', JSON.stringify(profile));
        } catch (err) {
          console.warn('Session expired or invalidated. Clearing credentials.');
          localStorage.removeItem('crimemind_token');
          localStorage.removeItem('crimemind_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsAuthLoading(false);
    };

    hydrateSession();
  }, []);

  const handleAuthSuccess = (authRes: AuthTokenResponse) => {
    const userProfile: User = {
      user_id: authRes.user_id,
      username: authRes.username,
      email: authRes.email || `${authRes.username}@crimemind.internal`,
      full_name: authRes.full_name,
      badge_number: authRes.badge_number,
      role: (authRes.role as any) || 'investigator',
      department: 'Criminal Investigation Division',
      picture: authRes.picture,
      provider: authRes.provider,
    };

    localStorage.setItem('crimemind_token', authRes.access_token);
    localStorage.setItem('crimemind_user', JSON.stringify(userProfile));
    setToken(authRes.access_token);
    setUser(userProfile);

    addToast(`Clearance Verified: Welcome, ${authRes.full_name}`, 'success');
  };

  const login = async (username: string, password: string): Promise<AuthTokenResponse> => {
    const res = await authApi.login(username, password);
    handleAuthSuccess(res);
    return res;
  };

  const loginWithGoogle = async (credential: string): Promise<AuthTokenResponse> => {
    const res = await authApi.loginWithGoogleCredential(credential);
    handleAuthSuccess(res);
    return res;
  };

  const loginWithGoogleCode = async (code: string, state?: string): Promise<AuthTokenResponse> => {
    const callbackPath = window.location.pathname.includes('auth/google/callback')
      ? '/auth/google/callback'
      : window.location.pathname.includes('login/callback')
      ? '/login/callback'
      : (googleConfig?.redirect_uri ? new URL(googleConfig.redirect_uri).pathname : '/auth/google/callback');
    const effectiveRedirectUri = window.location.origin + callbackPath;

    const res = await authApi.exchangeGoogleCode(code, state, effectiveRedirectUri);
    handleAuthSuccess(res);
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with local logout regardless of network
    } finally {
      localStorage.removeItem('crimemind_token');
      localStorage.removeItem('crimemind_user');
      setToken(null);
      setUser(null);
      addToast('Investigator session logged out', 'info');
      setActivePage('landing');
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

        // Auth
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAuthLoading,
        googleConfig,
        login,
        loginWithGoogle,
        loginWithGoogleCode,
        logout,
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

export const useAuth = () => {
  const { user, token, isAuthenticated, isAuthLoading, googleConfig, login, loginWithGoogle, loginWithGoogleCode, logout } = useApp();
  return { user, token, isAuthenticated, isAuthLoading, googleConfig, login, loginWithGoogle, loginWithGoogleCode, logout };
};

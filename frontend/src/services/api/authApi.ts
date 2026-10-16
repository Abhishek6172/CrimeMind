import { api } from './apiClient';
import { User, AuthTokenResponse, GooglePublicConfig } from '../../types';

export const authApi = {
  getGoogleConfig: async (): Promise<GooglePublicConfig> => {
    return api.get<GooglePublicConfig>('/auth/google/config');
  },

  getGoogleAuthUrl: async (redirectUri?: string): Promise<{ authorization_url: string; state: string; redirect_uri: string }> => {
    return api.get<{ authorization_url: string; state: string; redirect_uri: string }>('/auth/google/url', redirectUri ? { redirect_uri: redirectUri } : undefined);
  },

  loginWithGoogleCredential: async (credential: string): Promise<AuthTokenResponse> => {
    return api.post<AuthTokenResponse>('/auth/google', { credential });
  },

  exchangeGoogleCode: async (code: string, state?: string, redirectUri?: string): Promise<AuthTokenResponse> => {
    return api.post<AuthTokenResponse>('/auth/google/callback', {
      code,
      state,
      redirect_uri: redirectUri,
    });
  },

  login: async (username: string, password: string): Promise<AuthTokenResponse> => {
    return api.post<AuthTokenResponse>('/auth/login', { username, password });
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    badge_number?: string;
    department?: string;
  }): Promise<User> => {
    return api.post<User>('/auth/register', userData);
  },

  getCurrentUser: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  logout: async (): Promise<{ status: string }> => {
    return api.post<{ status: string }>('/auth/logout');
  },
};

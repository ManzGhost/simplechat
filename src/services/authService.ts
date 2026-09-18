import { api } from './api';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../types';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  logout(): void {
    try {
      api.post('/auth/logout').catch(() => {});
    } catch {
      // ignore
    }
    localStorage.removeItem('simplechat_token');
    localStorage.removeItem('simplechat_user');
  },
};

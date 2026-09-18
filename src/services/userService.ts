import { api } from './api';
import { User, UpdateProfilePayload } from '../types';

export const userService = {
  async getMe(): Promise<User> {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const response = await api.put<User>('/users/me', payload);
    return response.data;
  },

  async searchUsers(query: string): Promise<User[]> {
    const response = await api.get<User[]>('/users/search', {
      params: { query },
    });
    return response.data;
  },

  async deleteAccount(password?: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>('/users/me', {
      data: password ? { password } : {},
    });
    return response.data;
  },
};

import { api } from './api';
import { StatusFeedResponse, UserStatus, CreateStatusPayload } from '../types';

export const statusService = {
  async getStatusFeed(): Promise<StatusFeedResponse> {
    const response = await api.get<StatusFeedResponse>('/status');
    return response.data;
  },

  async createStatus(payload: CreateStatusPayload): Promise<{ success: boolean; status: UserStatus }> {
    const response = await api.post<{ success: boolean; status: UserStatus }>('/status', payload);
    return response.data;
  },

  async markStatusViewed(statusId: string): Promise<{ success: boolean; alreadyViewed?: boolean }> {
    const response = await api.post<{ success: boolean; alreadyViewed?: boolean }>(`/status/${statusId}/view`);
    return response.data;
  },

  async deleteStatus(statusId: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/status/${statusId}`);
    return response.data;
  },

  async deleteAllStatuses(): Promise<{ success: boolean; count?: number }> {
    const response = await api.delete<{ success: boolean; count?: number }>('/status/user/all');
    return response.data;
  },
};

import { api } from './api';
import { Conversation, Message, MessageType, MessageReplyMetadata } from '../types';

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<Conversation[]>('/conversations');
    return response.data;
  },

  async createOrGetConversation(userId: string): Promise<Conversation> {
    const response = await api.post<Conversation>(`/conversations/${userId}`);
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/conversations/${conversationId}`);
    return response.data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await api.get<Message[]>(`/messages/${conversationId}`);
    return response.data;
  },

  async sendMessage(data: {
    conversationId: string;
    receiverId?: string;
    content: string;
    messageType?: MessageType;
    replyTo?: MessageReplyMetadata;
  }): Promise<Message> {
    const response = await api.post<Message>('/messages', data);
    return response.data;
  },

  async markAsSeen(conversationId: string): Promise<{ success: boolean; seenCount: number }> {
    const response = await api.put<{ success: boolean; seenCount: number }>(`/messages/${conversationId}/seen`);
    return response.data;
  },
};

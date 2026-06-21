import apiClient from './apiClient';
import { ApiResponse } from '../types';

export interface CitizenChatbotHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export const citizenChatbotApi = {
  async sendMessage(payload: {
    message: string;
    history?: CitizenChatbotHistoryItem[];
  }): Promise<string> {
    const { data } = await apiClient.post<ApiResponse<{ reply: string }>>(
      '/citizen/chatbot',
      payload
    );
    return data.data?.reply ?? '';
  },
};


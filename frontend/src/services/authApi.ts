import apiClient from './apiClient';
import { ApiResponse, AuthUser, LoginResponse } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  tenantSlug: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  tenantSlug: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/register', payload);
    return data.data!;
  },

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return data.data!;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
    return data.data!;
  },

  logout(): void {
    localStorage.removeItem('ps_crm_token');
    localStorage.removeItem('ps_crm_user');
  },
};

import apiClient from './apiClient';
import { ApiResponse, AnalyticsSummary, CriticalZone, Department, User, GrievanceLog } from '../types';

export const adminApi = {
  async getAnalytics(params?: { from?: string; to?: string; departmentId?: string }): Promise<AnalyticsSummary> {
    const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>('/admin/analytics', { params });
    return data.data!;
  },

  async getCriticalZones(): Promise<CriticalZone[]> {
    const { data } = await apiClient.get<ApiResponse<CriticalZone[]>>('/admin/critical-zones');
    return data.data!;
  },

  async getDepartments(): Promise<Department[]> {
    const { data } = await apiClient.get<ApiResponse<Department[]>>('/admin/departments');
    return data.data!;
  },

  async createDepartment(payload: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.post<ApiResponse<Department>>('/admin/departments', payload);
    return data.data!;
  },

  async updateDepartment(id: string, payload: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.put<ApiResponse<Department>>(`/admin/departments/${id}`, payload);
    return data.data!;
  },

  async getUsers(params?: { role?: string; departmentId?: string }): Promise<User[]> {
    const { data } = await apiClient.get<ApiResponse<User[]>>('/admin/users', { params });
    return data.data!;
  },

  async updateUserRole(userId: string, role: string): Promise<User> {
    const { data } = await apiClient.patch<ApiResponse<User>>(`/admin/users/${userId}/role`, { role });
    return data.data!;
  },

  async getAuditLogs(params?: {
    userId?: string;
    eventType?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GrievanceLog[]; total: number }> {
    const { data } = await apiClient.get('/admin/audit-logs', { params });
    return data;
  },

  async exportGrievances(params?: Record<string, string>): Promise<Blob> {
    const response = await apiClient.get('/admin/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export interface OfficerLeaderboardEntry {
  rank: number;
  officerId: string;
  name: string;
  email: string;
  role: string;
  departmentName: string;
  total: number;
  resolved: number;
  active: number;
  breached: number;
  slaHit: number;
  slaMiss: number;
  avgHours: number;
  resolutionRate: number;
  slaRate: number;
}

export async function getLeaderboard(): Promise<OfficerLeaderboardEntry[]> {
  const { data } = await apiClient.get('/admin/leaderboard');
  return data.data ?? [];
}
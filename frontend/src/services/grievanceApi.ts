import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, Grievance, GrievanceLog, GrievanceFilters } from '../types';

export interface CreateGrievancePayload {
  title: string;
  description: string;
  category?: string;
  address: string;
  ward?: string;
  lat?: number;
  lng?: number;
}

export interface FeedbackPayload {
  rating: number;
  comment?: string;
}

export const grievanceApi = {
  // ── Citizen ────────────────────────────────────────────────────────────────
  async create(payload: FormData): Promise<Grievance> {
    const { data } = await apiClient.post<ApiResponse<Grievance>>('/citizen/grievances', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data!;
  },

  async myGrievances(params?: GrievanceFilters): Promise<PaginatedResponse<Grievance>> {
    const { data } = await apiClient.get<PaginatedResponse<Grievance>>('/citizen/grievances', { params });
    return data;
  },

  async getById(id: string): Promise<Grievance> {
    const { data } = await apiClient.get<ApiResponse<Grievance>>(`/citizen/grievances/${id}`);
    return data.data!;
  },

  async submitFeedback(id: string, payload: FeedbackPayload): Promise<void> {
    await apiClient.post(`/citizen/grievances/${id}/feedback`, payload);
  },

  async reopen(id: string, reason: string): Promise<Grievance> {
    const { data } = await apiClient.post<ApiResponse<Grievance>>(
      `/citizen/grievances/${id}/reopen`,
      { reason }
    );
    return data.data!;
  },

  async support(id: string): Promise<{ message: string; ticketNumber: string }> {
    const { data } = await apiClient.post<ApiResponse<{ message: string; ticketNumber: string }>>(
      `/citizen/grievances/${id}/support`
    );
    return data.data!;
  },

  async deleteCitizen(id: string): Promise<void> {
    await apiClient.delete(`/citizen/grievances/${id}`);
  },

  async getTimeline(id: string): Promise<GrievanceLog[]> {
    const { data } = await apiClient.get<ApiResponse<GrievanceLog[]>>(
      `/citizen/grievances/${id}/timeline`
    );
    return data.data!;
  },

  // ── Officer ────────────────────────────────────────────────────────────────
  async officerGetById(id: string): Promise<Grievance> {
    const { data } = await apiClient.get<ApiResponse<Grievance>>(`/officer/grievances/${id}`);
    return data.data!;
  },

  async officerGetTimeline(id: string): Promise<GrievanceLog[]> {
    const { data } = await apiClient.get<ApiResponse<GrievanceLog[]>>(`/officer/grievances/${id}/timeline`);
    return data.data!;
  },

  async officerGrievances(params?: GrievanceFilters): Promise<PaginatedResponse<Grievance>> {
    const { data } = await apiClient.get<PaginatedResponse<Grievance>>(
      '/officer/grievances',
      { params }
    );
    return data;
  },

  async updateStatus(
    id: string,
    status: string,
    remarks?: string
  ): Promise<Grievance> {
    const { data } = await apiClient.patch<ApiResponse<Grievance>>(
      `/officer/grievances/${id}/status`,
      { status, remarks }
    );
    return data.data!;
  },

  async uploadProof(id: string, formData: FormData): Promise<Grievance> {
    const { data } = await apiClient.post<ApiResponse<Grievance>>(
      `/officer/grievances/${id}/proof`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data!;
  },

  async officerPerformance(): Promise<unknown> {
    const { data } = await apiClient.get('/officer/performance');
    return data.data;
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  async adminGrievances(params?: GrievanceFilters): Promise<PaginatedResponse<Grievance>> {
    const { data } = await apiClient.get<PaginatedResponse<Grievance>>(
      '/admin/grievances',
      { params }
    );
    return data;
  },

  async reassign(id: string, officerId: string): Promise<Grievance> {
    const { data } = await apiClient.patch<ApiResponse<Grievance>>(
      `/admin/grievances/${id}/assign`,
      { officerId }
    );
    return data.data!;
  },

  async adminTimeline(id: string): Promise<GrievanceLog[]> {
    const { data } = await apiClient.get<ApiResponse<GrievanceLog[]>>(
      `/admin/grievances/${id}/timeline`
    );
    return data.data!;
  },

  async deleteAdmin(id: string): Promise<void> {
    await apiClient.delete(`/admin/grievances/${id}`);
  },
};
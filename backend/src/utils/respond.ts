import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export const respond = {
  ok<T>(res: Response, data: T, message?: string): void {
    const body: ApiResponse<T> = { success: true, data, message };
    res.status(200).json(body);
  },

  created<T>(res: Response, data: T, message?: string): void {
    const body: ApiResponse<T> = { success: true, data, message };
    res.status(201).json(body);
  },

  paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
  ): void {
    const body: PaginatedResponse<T> = {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    res.status(200).json(body);
  },

  badRequest(res: Response, message: string, errors?: string[]): void {
    res.status(400).json({ success: false, message, errors });
  },

  unauthorized(res: Response, message = 'Unauthorized'): void {
    res.status(401).json({ success: false, message });
  },

  forbidden(res: Response, message = 'Forbidden'): void {
    res.status(403).json({ success: false, message });
  },

  notFound(res: Response, message = 'Not found'): void {
    res.status(404).json({ success: false, message });
  },

  conflict(res: Response, message: string): void {
    res.status(409).json({ success: false, message });
  },

  serverError(res: Response, message = 'Internal server error'): void {
    res.status(500).json({ success: false, message });
  },
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { Grievance, GrievanceFilters, PaginatedResponse } from '../types';
import { getSocket } from '../services/socketClient';
import { SocketEvent } from '../types';

type FetchFn = (filters: GrievanceFilters) => Promise<PaginatedResponse<Grievance>>;

interface UseGrievancesOptions {
  fetchFn: FetchFn;
  initialFilters?: GrievanceFilters;
  realtime?: boolean;
}

export function useGrievances({ fetchFn, initialFilters = {}, realtime = false }: UseGrievancesOptions) {
  const [data, setData]         = useState<Grievance[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filters, setFilters]   = useState<GrievanceFilters>({ page: 1, limit: 20, ...initialFilters });
  const fetchRef                = useRef(fetchFn);
  fetchRef.current              = fetchFn;

  const load = useCallback(async (f: GrievanceFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRef.current(f);
      setData(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [filters, load]);

  // Real-time refresh on socket events
  useEffect(() => {
    if (!realtime) return;
    const socket = getSocket();
    const refresh = () => load(filters);
    socket.on(SocketEvent.GRIEVANCE_CREATED, refresh);
    socket.on(SocketEvent.GRIEVANCE_UPDATED, refresh);
    return () => {
      socket.off(SocketEvent.GRIEVANCE_CREATED, refresh);
      socket.off(SocketEvent.GRIEVANCE_UPDATED, refresh);
    };
  }, [realtime, filters, load]);

  const updateFilter = useCallback((key: keyof GrievanceFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => load(filters), [filters, load]);

  return { data, total, loading, error, filters, updateFilter, setPage, refresh };
}

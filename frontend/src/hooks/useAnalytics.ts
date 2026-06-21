import { useState, useEffect, useCallback } from 'react';
import { AnalyticsSummary } from '../types';
import { adminApi } from '../services/adminApi';

interface UseAnalyticsOptions {
  from?: string;
  to?: string;
  departmentId?: string;
}

export function useAnalytics(opts: UseAnalyticsOptions = {}) {
  const [data, setData]       = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getAnalytics(opts);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [opts.from, opts.to, opts.departmentId]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

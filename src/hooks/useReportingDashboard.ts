import { useState, useEffect, useCallback } from 'react';
import { fetchReportingDashboard } from '../lib/reportingApi';
import type { ReportingDashboard } from '../types/reporting';

export function useReportingDashboard() {
  const [data, setData] = useState<ReportingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await fetchReportingDashboard());
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000); // refresh every 15 min
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, error, refresh: load };
}

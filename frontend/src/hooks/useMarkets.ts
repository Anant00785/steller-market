'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMarkets, getMarket } from '@/lib/api';
import type { Market } from '@/types';

export function useMarkets(pollMs = 5000) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await getMarkets();
      setMarkets(data.markets);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, pollMs);
    return () => clearInterval(interval);
  }, [fetchAll, pollMs]);

  return { markets, loading, error, refetch: fetchAll };
}

export function useMarket(id: number | null, pollMs = 5000) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (id === null) return;
    try {
      const data = await getMarket(id);
      setMarket(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, pollMs);
    return () => clearInterval(interval);
  }, [fetch, pollMs]);

  return { market, loading, error, refetch: fetch };
}

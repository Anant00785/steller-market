/**
 * API client for the StellarBet backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Markets ─────────────────────────────────────────────────────────────────

export const getMarkets = () =>
  apiFetch<{ markets: import('@/types').Market[] }>('/api/markets');

export const getMarket = (id: number) =>
  apiFetch<import('@/types').Market>(`/api/markets/${id}`);

// ─── Bets ─────────────────────────────────────────────────────────────────────

export const getPortfolio = (address: string) =>
  apiFetch<import('@/types').Portfolio>(`/api/bets/${address}`);

export const getLeaderboard = (limit = 20) =>
  apiFetch<{ leaderboard: import('@/types').LeaderboardEntry[] }>(
    `/api/bets/leaderboard?limit=${limit}`
  );

// ─── Admin (authenticated) ────────────────────────────────────────────────────

export const adminLogin = (secret: string) =>
  apiFetch<{ token: string }>('/api/markets/token', {
    method: 'POST',
    body: JSON.stringify({ secret }),
  });

export const adminCreateMarket = (
  token: string,
  data: { question: string; category: string; end_time: string }
) =>
  apiFetch('/api/markets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const adminResolveMarket = (
  token: string,
  id: number,
  outcome: 'Yes' | 'No'
) =>
  apiFetch(`/api/markets/${id}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });

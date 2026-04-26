'use client';

import { useState } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { adminLogin, adminCreateMarket, adminResolveMarket } from '@/lib/api';
import TransactionToast from '@/components/ui/TransactionToast';

const CATEGORIES = ['Crypto', 'Politics', 'Sports', 'Tech', 'General'];

export default function AdminClient() {
  const { markets, refetch } = useMarkets(60000);
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Create form state
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Resolve state
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { token: t } = await adminLogin(secret);
      setToken(t);
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCreate() {
    if (!token || !question || !endDate) return;
    setCreating(true);
    try {
      await adminCreateMarket(token, { question, category, end_time: endDate });
      setToast({ msg: `Market created: "${question}"`, type: 'success' });
      setQuestion('');
      setEndDate('');
      refetch();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Create failed', type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function handleResolve(id: number, outcome: 'Yes' | 'No') {
    if (!token) return;
    setResolvingId(id);
    try {
      await adminResolveMarket(token, id, outcome);
      setToast({ msg: `Market #${id} resolved: ${outcome}`, type: 'success' });
      refetch();
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Resolve failed', type: 'error' });
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="section-container py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-bold gradient-text mb-2">Admin Panel</h1>
      <p className="text-[var(--text-muted)] mb-8">Create markets and resolve outcomes as the oracle.</p>

      {/* Login section */}
      {!token ? (
        <div className="glass-card p-6 mb-8">
          <h2 className="font-semibold mb-4">🔐 Admin Login</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Enter your <code className="text-[#a5b4fc]">ADMIN_SECRET_KEY</code> to authenticate.
          </p>
          <input
            id="admin-secret-input"
            type="password"
            placeholder="S…"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="input-glass mb-3"
          />
          {loginError && (
            <p className="text-sm text-[#fca5a5] mb-3">⚠️ {loginError}</p>
          )}
          <button
            id="admin-login-btn"
            onClick={handleLogin}
            disabled={loginLoading || !secret}
            className="btn-primary"
          >
            {loginLoading ? 'Authenticating…' : 'Login as Admin'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6">
            <span className="badge badge-green">✅ Authenticated as Admin</span>
            <button
              onClick={() => setToken(null)}
              className="text-xs text-[var(--text-muted)] hover:text-white"
            >
              Logout
            </button>
          </div>

          {/* Create market */}
          <div className="glass-card p-6 mb-8">
            <h2 className="font-semibold mb-5">➕ Create Market</h2>

            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
              Question
            </label>
            <input
              id="market-question-input"
              type="text"
              placeholder="Will BTC hit $200k in 2025?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="input-glass mb-4"
            />

            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
              Category
            </label>
            <select
              id="market-category-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-glass mb-4"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
              End Date & Time
            </label>
            <input
              id="market-enddate-input"
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input-glass mb-5"
            />

            <button
              id="create-market-btn"
              onClick={handleCreate}
              disabled={creating || !question || !endDate}
              className="btn-primary w-full"
            >
              {creating ? 'Creating on-chain…' : 'Create Market'}
            </button>
          </div>

          {/* Resolve markets */}
          <div className="glass-card p-6">
            <h2 className="font-semibold mb-5">⚡ Resolve Markets</h2>
            {markets.filter(m => !m.resolved && m.time_remaining <= 0).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No markets awaiting resolution.</p>
            ) : (
              <div className="space-y-4">
                {markets
                  .filter(m => !m.resolved && m.time_remaining <= 0)
                  .map(m => (
                    <div key={m.id} id={`resolve-market-${m.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-glass)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.question}</p>
                        <p className="text-xs text-[var(--text-muted)]">Market #{m.id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          id={`resolve-yes-${m.id}`}
                          onClick={() => handleResolve(m.id, 'Yes')}
                          disabled={resolvingId === m.id}
                          className="btn-yes text-sm py-1.5 px-4"
                        >
                          YES
                        </button>
                        <button
                          id={`resolve-no-${m.id}`}
                          onClick={() => handleResolve(m.id, 'No')}
                          disabled={resolvingId === m.id}
                          className="btn-no text-sm py-1.5 px-4"
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <TransactionToast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

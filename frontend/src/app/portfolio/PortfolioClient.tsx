'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { getPortfolio } from '@/lib/api';
import { buildAndSubmitClaim, stroopsToUsdc, shortenAddress } from '@/lib/soroban';
import TransactionToast from '@/components/ui/TransactionToast';
import type { Portfolio, Bet } from '@/types';

export default function PortfolioClient() {
  const { address, connected, connect } = useWallet();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; txHash?: string } | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getPortfolio(address)
      .then(data => { setPortfolio(data); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  async function handleClaim(bet: Bet) {
    if (!address) return;
    setClaimingId(bet.market_id);
    try {
      const hash = await buildAndSubmitClaim(address, bet.market_id);
      setToast({ msg: 'Reward claimed!', type: 'success', txHash: hash });
      // Refresh portfolio
      const data = await getPortfolio(address);
      setPortfolio(data);
    } catch (e: unknown) {
      setToast({ msg: e instanceof Error ? e.message : 'Claim failed', type: 'error' });
    } finally {
      setClaimingId(null);
    }
  }

  if (!connected) {
    return (
      <div className="section-container py-20 text-center">
        <p className="text-5xl mb-4">👛</p>
        <h1 className="font-display text-2xl font-bold mb-3">My Portfolio</h1>
        <p className="text-[var(--text-muted)] mb-6">Connect your wallet to see your bets.</p>
        <button id="portfolio-connect-btn" onClick={connect} className="btn-primary">
          Connect Freighter Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="section-container py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">My Portfolio</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{shortenAddress(address!)}</p>
        </div>
      </div>

      {/* Stats */}
      {portfolio?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bets', value: portfolio.stats.total_bets },
            { label: 'Wins', value: portfolio.stats.wins, className: 'text-[#22c55e]' },
            { label: 'Losses', value: portfolio.stats.losses, className: 'text-[#ef4444]' },
            { label: 'Total Wagered', value: `${stroopsToUsdc(portfolio.stats.total_wagered)} USDC` },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className={`text-2xl font-bold ${s.className ?? 'gradient-text'}`}>{s.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bets table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[#fca5a5] text-center py-12">⚠️ {error}</p>
      ) : portfolio?.bets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-[var(--text-muted)]">No bets yet. Go find a market!</p>
          <Link href="/" className="btn-primary inline-flex mt-5">Browse Markets</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolio?.bets.map((bet: Bet) => (
            <div key={bet.id} id={`bet-row-${bet.id}`} className="glass-card p-4 flex items-center gap-4">
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                bet.won ? 'bg-[#22c55e]' : bet.lost ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
              }`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{bet.question}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {bet.outcome} · {stroopsToUsdc(bet.amount)} USDC ·{' '}
                  {new Date(bet.timestamp * 1000).toLocaleDateString()}
                </p>
              </div>

              {/* Status badge */}
              <div>
                {bet.won ? (
                  bet.claimed ? (
                    <span className="badge badge-gray">Claimed</span>
                  ) : (
                    <button
                      id={`claim-btn-${bet.market_id}`}
                      onClick={() => handleClaim(bet)}
                      disabled={claimingId === bet.market_id}
                      className="btn-accent text-xs py-1.5 px-3"
                    >
                      {claimingId === bet.market_id ? 'Claiming…' : 'Claim Reward'}
                    </button>
                  )
                ) : bet.lost ? (
                  <span className="badge badge-red">Lost</span>
                ) : (
                  <span className="badge badge-gray">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <TransactionToast
          message={toast.msg}
          type={toast.type}
          txHash={toast.txHash}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

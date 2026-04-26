'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMarket } from '@/hooks/useMarkets';
import { useWallet } from '@/hooks/useWallet';
import BetModal from '@/components/market/BetModal';
import TransactionToast from '@/components/ui/TransactionToast';
import { formatCountdown, stroopsToUsdc } from '@/lib/soroban';

interface Props {
  id: number;
}

export default function MarketDetailClient({ id }: Props) {
  const { market, loading, error } = useMarket(id);
  const { address, connected, connect } = useWallet();
  const [showBetModal, setShowBetModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error'; txHash?: string } | null>(null);

  if (loading) {
    return (
      <div className="section-container py-12">
        <div className="skeleton h-8 w-64 mb-4 rounded-xl" />
        <div className="skeleton h-52 rounded-2xl mb-5" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="section-container py-20 text-center">
        <p className="text-[#fca5a5] mb-2">⚠️ {error || 'Market not found'}</p>
        <Link href="/" className="btn-ghost inline-flex mt-4">← Back to Markets</Link>
      </div>
    );
  }

  const { yesPct, noPct } = market.odds;
  const totalVolume = BigInt(market.yes_total) + BigInt(market.no_total);
  const canBet = connected && !market.resolved && market.time_remaining > 0;

  return (
    <div className="section-container py-12 max-w-3xl">
      {/* Breadcrumb */}
      <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-white mb-6 inline-flex items-center gap-1">
        ← Markets
      </Link>

      {/* Title card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="badge badge-purple">{market.category}</span>
          {market.resolved ? (
            <span className={`badge ${market.outcome === 'Yes' ? 'badge-green' : 'badge-red'}`}>
              {market.outcome} Won
            </span>
          ) : market.time_remaining > 0 ? (
            <span className="badge badge-cyan">🔴 Live</span>
          ) : (
            <span className="badge badge-gray">Awaiting Resolution</span>
          )}
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{market.question}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {market.resolved
            ? `Resolved: ${market.outcome}`
            : `Closes in: ${formatCountdown(market.time_remaining)}`}
        </p>
      </div>

      {/* Odds panel */}
      <div className="glass-card p-6 mb-6">
        <h2 className="font-semibold mb-4">Live Odds</h2>
        <div className="flex justify-between font-bold mb-2">
          <span className="text-[#22c55e] text-xl">YES {yesPct.toFixed(1)}%</span>
          <span className="text-[#ef4444] text-xl">{noPct.toFixed(1)}% NO</span>
        </div>
        <div className="odds-bar h-4 mb-5">
          <div className="odds-bar-yes h-full" style={{ width: `${yesPct}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-[#22c55e] font-bold text-lg">{stroopsToUsdc(market.yes_total)} USDC</div>
            <div className="text-[var(--text-muted)]">YES Pool</div>
          </div>
          <div>
            <div className="text-white font-bold text-lg">{stroopsToUsdc(totalVolume.toString())} USDC</div>
            <div className="text-[var(--text-muted)]">Total Volume</div>
          </div>
          <div>
            <div className="text-[#ef4444] font-bold text-lg">{stroopsToUsdc(market.no_total)} USDC</div>
            <div className="text-[var(--text-muted)]">NO Pool</div>
          </div>
        </div>
      </div>

      {/* Bet CTA */}
      {!market.resolved && (
        <div className="glass-card p-6 mb-6">
          <h2 className="font-semibold mb-3">Place Your Bet</h2>
          {!connected ? (
            <div className="text-center">
              <p className="text-[var(--text-muted)] mb-4 text-sm">Connect your Freighter wallet to start betting.</p>
              <button id="detail-connect-btn" onClick={connect} className="btn-primary">
                Connect Freighter Wallet
              </button>
            </div>
          ) : market.time_remaining <= 0 ? (
            <p className="text-[var(--text-muted)] text-sm">This market has ended. Awaiting resolution by the oracle.</p>
          ) : (
            <button
              id="open-bet-modal-btn"
              onClick={() => setShowBetModal(true)}
              className="btn-primary w-full"
            >
              Place Bet ⭐
            </button>
          )}
        </div>
      )}

      {/* Market info */}
      <div className="glass-card p-5">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Market ID</span>
          <span className="font-mono">#{market.id}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-[var(--text-muted)]">Total Bettors</span>
          <span>{market.total_bets}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-[var(--text-muted)]">Created by</span>
          <span className="font-mono text-xs">{market.created_by}</span>
        </div>
      </div>

      {/* Bet modal */}
      {showBetModal && address && (
        <BetModal
          market={market}
          address={address}
          onClose={() => setShowBetModal(false)}
          onSuccess={txHash => {
            setShowBetModal(false);
            setToast({ msg: 'Bet placed successfully!', type: 'success', txHash });
          }}
        />
      )}

      {/* Toast */}
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

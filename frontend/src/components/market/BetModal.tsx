'use client';

import { useState } from 'react';
import type { Market, Outcome } from '@/types';
import {
  buildAndSubmitBet,
  stroopsToUsdc,
  usdcToStroops,
} from '@/lib/soroban';

interface Props {
  market: Market;
  address: string;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

export default function BetModal({ market, address, onClose, onSuccess }: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const amountStroops = usdcToStroops(amountNum);

  // Compute payout preview
  const yesPool = BigInt(market.yes_total);
  const noPool = BigInt(market.no_total);
  const totalPool = yesPool + noPool + amountStroops;
  const winPool =
    selectedOutcome === 'Yes' ? yesPool + amountStroops : noPool + amountStroops;
  const estimatedPayout =
    winPool > 0n ? (amountStroops * totalPool) / winPool : 0n;

  async function handleBet() {
    if (!selectedOutcome || amountNum <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await buildAndSubmitBet(
        address,
        market.id,
        selectedOutcome,
        amountStroops
      );
      onSuccess(hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Place Bet">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold gradient-text mb-1">Place a Bet</h2>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">{market.question}</p>
          </div>
          <button
            id="bet-modal-close"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white ml-4 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Outcome selector */}
        <div className="flex gap-3 mb-5">
          <button
            id="bet-yes-btn"
            className={`btn-yes ${selectedOutcome === 'Yes' ? 'active' : ''}`}
            onClick={() => setSelectedOutcome('Yes')}
          >
            ✅ YES · {market.odds.yesPct.toFixed(1)}%
          </button>
          <button
            id="bet-no-btn"
            className={`btn-no ${selectedOutcome === 'No' ? 'active' : ''}`}
            onClick={() => setSelectedOutcome('No')}
          >
            ❌ NO · {market.odds.noPct.toFixed(1)}%
          </button>
        </div>

        {/* Amount input */}
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
          Amount (USDC)
        </label>
        <input
          id="bet-amount-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="input-glass mb-4"
        />

        {/* Payout preview */}
        {amountNum > 0 && selectedOutcome && (
          <div className="glass-card p-3 mb-5 text-sm">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Potential payout</span>
              <span className="text-[#22c55e] font-bold">
                ~{stroopsToUsdc(estimatedPayout)} USDC
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)] mt-1">
              <span>Pool size after</span>
              <span>{stroopsToUsdc(totalPool)} USDC</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-[#fca5a5] bg-[rgba(239,68,68,0.1)] rounded-lg p-3 mb-4">
            ⚠️ {error}
          </p>
        )}

        {/* CTA */}
        <button
          id="bet-confirm-btn"
          onClick={handleBet}
          disabled={!selectedOutcome || amountNum <= 0 || loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing…
            </>
          ) : (
            `Bet ${amountNum > 0 ? amountNum.toFixed(2) : ''} USDC on ${selectedOutcome ?? '…'}`
          )}
        </button>

        <p className="text-xs text-center text-[var(--text-muted)] mt-3">
          Freighter wallet will prompt you to sign the transaction.
        </p>
      </div>
    </div>
  );
}

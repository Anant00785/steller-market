'use client';

import Link from 'next/link';
import type { Market } from '@/types';
import { formatCountdown, stroopsToUsdc } from '@/lib/soroban';

interface Props {
  market: Market;
}

export default function MarketCard({ market }: Props) {
  const { yesPct, noPct } = market.odds;
  const isLive = !market.resolved && market.time_remaining > 0;
  const isEnded = !market.resolved && market.time_remaining <= 0;

  return (
    <Link href={`/markets/${market.id}`} id={`market-card-${market.id}`}>
      <article className="glass-card p-5 cursor-pointer group">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge badge-purple">{market.category}</span>
            {market.resolved ? (
              <span className={`badge ${market.outcome === 'Yes' ? 'badge-green' : 'badge-red'}`}>
                {market.outcome} Won
              </span>
            ) : isLive ? (
              <span className="badge badge-cyan">🔴 Live</span>
            ) : (
              <span className="badge badge-gray">Ended</span>
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {market.resolved ? '✅ Resolved' : formatCountdown(market.time_remaining)}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-base font-semibold leading-snug mb-4 text-[var(--text-primary)] group-hover:text-white transition-colors line-clamp-2">
          {market.question}
        </h3>

        {/* Odds bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-[#22c55e]">YES {yesPct.toFixed(1)}%</span>
            <span className="text-[#ef4444]">{noPct.toFixed(1)}% NO</span>
          </div>
          <div className="odds-bar">
            <div className="odds-bar-yes" style={{ width: `${yesPct}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-glass)]">
          <span>💰 {stroopsToUsdc(BigInt(market.yes_total) + BigInt(market.no_total))} USDC</span>
          <span>{market.total_bets} bettors</span>
        </div>
      </article>
    </Link>
  );
}

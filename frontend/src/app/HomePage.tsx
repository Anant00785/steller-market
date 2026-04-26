'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMarkets } from '@/hooks/useMarkets';
import MarketCard from '@/components/market/MarketCard';
import type { Market } from '@/types';

const CATEGORIES = ['All', 'Crypto', 'Politics', 'Sports', 'Tech', 'General'];

export default function HomePage() {
  const { markets, loading, error } = useMarkets();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = markets.filter(m => {
    const matchCat = category === 'All' || m.category === category;
    const matchSearch = m.question.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeMarkets = markets.filter(m => !m.resolved);
  const totalVolume = markets.reduce(
    (sum, m) => sum + BigInt(m.yes_total) + BigInt(m.no_total),
    0n
  );

  return (
    <div className="section-container py-12">
      {/* Hero */}
      <section className="text-center mb-14">
        <div className="inline-flex items-center gap-2 badge badge-purple mb-5 text-sm">
          ⚡ Live on Stellar Testnet
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
          Predict the <span className="gradient-text">Future</span>.<br />
          Win with <span className="gradient-text">USDC</span>.
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto mb-8">
          Bet on real-world events — crypto prices, politics, sports — fully secured
          by Soroban smart contracts on Stellar.
        </p>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-8 mb-8">
          {[
            { label: 'Active Markets', value: activeMarkets.length },
            { label: 'Total Volume', value: `${(Number(totalVolume) / 1e7).toFixed(2)} USDC` },
            { label: 'Total Bets', value: markets.reduce((s, m) => s + m.total_bets, 0) },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          id="market-search"
          type="search"
          placeholder="Search markets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-glass sm:max-w-64"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase()}`}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-[rgba(108,99,255,0.2)] text-[#a5b4fc] border border-[rgba(108,99,255,0.4)]'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Market grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-[#fca5a5] mb-2">⚠️ Failed to load markets</p>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Make sure the backend is running at port 4000.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No markets found</p>
          <p className="text-sm mt-1">Try a different filter or search term.</p>
          <Link href="/admin" className="btn-primary inline-flex mt-5">
            Create a Market
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m: Market) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}

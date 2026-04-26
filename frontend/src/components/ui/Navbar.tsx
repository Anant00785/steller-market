'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { shortenAddress } from '@/lib/soroban';

const NAV_LINKS = [
  { href: '/',          label: 'Markets'   },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/admin',     label: 'Admin'     },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, connected, loading, connect, disconnect } = useWallet();

  return (
    <nav className="nav-glass" role="navigation" aria-label="Main navigation">
      <div className="section-container h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
          <span className="text-2xl">⭐</span>
          <span className="gradient-text">StellarBet</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-white bg-[rgba(108,99,255,0.15)] border border-[rgba(108,99,255,0.3)]'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Wallet button */}
        <div>
          {loading ? (
            <div className="skeleton h-9 w-32 rounded-lg" />
          ) : connected ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-[var(--text-muted)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-lg border border-[var(--border-glass)]">
                🟢 {shortenAddress(address!)}
              </span>
              <button id="wallet-disconnect-btn" onClick={disconnect} className="btn-ghost text-sm py-1.5">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              id="wallet-connect-btn"
              onClick={connect}
              className="btn-primary pulse-glow"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

// Types mirroring Soroban contract structs

export type Outcome = 'Yes' | 'No' | 'Unresolved';

export interface Market {
  id: number;
  question: string;
  category: string;
  end_time: number;      // unix seconds
  created_by: string;
  resolved: boolean;
  outcome: Outcome;
  yes_total: string;     // stroops as string (big number safe)
  no_total: string;
  total_bets: number;
  odds: { yesPct: number; noPct: number };
  time_remaining: number; // seconds
  created_at?: number;
}

export interface Bet {
  id: number;
  tx_hash: string;
  market_id: number;
  bettor: string;
  outcome: Outcome;
  amount: string;        // stroops as string
  timestamp: number;
  // enriched
  question?: string;
  resolved?: boolean;
  market_outcome?: Outcome;
  won?: boolean;
  lost?: boolean;
  pending?: boolean;
  claimed?: boolean;
}

export interface PortfolioStats {
  total_bets: number;
  wins: number;
  losses: number;
  pending: number;
  total_wagered: string;
}

export interface Portfolio {
  address: string;
  bets: Bet[];
  stats: PortfolioStats;
}

export interface LeaderboardEntry {
  bettor: string;
  total_bets: number;
  total_wagered: string;
}

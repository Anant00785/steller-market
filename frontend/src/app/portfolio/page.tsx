import type { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import PortfolioClient from './PortfolioClient';

export const metadata: Metadata = {
  title: 'My Portfolio — StellarBet',
  description: 'View your prediction market bets, winnings, and claimable rewards on StellarBet.',
};

export default function PortfolioPage() {
  return (
    <>
      <Navbar />
      <main>
        <PortfolioClient />
      </main>
    </>
  );
}

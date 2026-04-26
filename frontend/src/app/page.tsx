import type { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import HomePage from './HomePage';

export const metadata: Metadata = {
  title: 'StellarBet — Prediction Markets on Stellar',
  description: 'Bet on crypto, politics, sports and more using USDC on Stellar Testnet.',
};

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <HomePage />
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import MarketDetailClient from './MarketDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Market #${id} — StellarBet`,
    description: `View odds and place bets on prediction market #${id} on Stellar.`,
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <Navbar />
      <main>
        <MarketDetailClient id={parseInt(id)} />
      </main>
    </>
  );
}

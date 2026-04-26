import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StellarBet — Decentralized Prediction Market',
  description:
    'Bet on real-world events using USDC on the Stellar blockchain. Powered by Soroban smart contracts.',
  keywords: ['prediction market', 'stellar', 'soroban', 'defi', 'betting', 'blockchain'],
  openGraph: {
    title: 'StellarBet',
    description: 'Decentralized prediction market on Stellar',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#050510] text-white antialiased">{children}</body>
    </html>
  );
}

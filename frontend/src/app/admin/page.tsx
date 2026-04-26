import type { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';
import AdminClient from './AdminClient';

export const metadata: Metadata = {
  title: 'Admin Panel — StellarBet',
  description: 'Create and resolve prediction markets on StellarBet.',
};

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main>
        <AdminClient />
      </main>
    </>
  );
}

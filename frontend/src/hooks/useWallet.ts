'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  connectFreighter,
  getFreighterAddress,
  isFreighterInstalled,
} from '@/lib/soroban';

interface WalletState {
  address: string | null;
  connected: boolean;
  installed: boolean;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const inst = await isFreighterInstalled();
      setInstalled(inst);
      if (inst) {
        const addr = await getFreighterAddress();
        setAddress(addr);
      }
      setLoading(false);
    }
    init();
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    const addr = await connectFreighter();
    setAddress(addr);
    setLoading(false);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return {
    address,
    connected: !!address,
    installed,
    loading,
    connect,
    disconnect,
  };
}

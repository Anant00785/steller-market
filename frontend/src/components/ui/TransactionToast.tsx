'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  txHash?: string;
  onClose: () => void;
}

export default function TransactionToast({ message, type, txHash, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 7000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      id="tx-toast"
      className={`toast ${type === 'success' ? 'toast-success' : 'toast-error'}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{type === 'success' ? '✅' : '❌'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{message}</p>
          {txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline opacity-80 hover:opacity-100 mt-0.5 block truncate"
            >
              View on Explorer →
            </a>
          )}
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">
          ×
        </button>
      </div>
    </div>
  );
}

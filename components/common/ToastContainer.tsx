'use client';

import React from 'react';
import { useSignal, toasts } from '@/store';

export const ToastContainer: React.FC = () => {
  const currentToasts = useSignal(toasts);

  if (!currentToasts || currentToasts.length === 0) return null;

  return (
    <div className="toast-container">
      {currentToasts.map((t) => (
        <div key={t.id} className="toast">
          <span>
            {t.type === 'ok' ? '✅' : t.type === 'gold' ? '⭐' : t.type === 'bad' ? '❌' : 'ℹ️'}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
};

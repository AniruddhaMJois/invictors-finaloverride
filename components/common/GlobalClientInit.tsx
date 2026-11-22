'use client';

import React, { useEffect } from 'react';
import { wsManager, syncServerTime, teamState } from '@/store';

export const GlobalClientInit: React.FC = () => {
  useEffect(() => {
    // Connect WebSocket
    wsManager.connect();
    // Sync Authoritative Time
    syncServerTime();

    // Check if team cookie already exists & restore state (if not on admin/coordinator)
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/admin') && !currentPath.startsWith('/coordinator')) {
      fetch('/api/state')
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data && data.id) {
            teamState.value = data;
          }
        })
        .catch((err) => console.log('Session Check:', err));
    }
  }, []);

  return null;
};

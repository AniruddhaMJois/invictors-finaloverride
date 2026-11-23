'use client';

import React, { useEffect } from 'react';
import { wsManager, syncServerTime, teamState, isGlobalPaused } from '@/store';
import { supabaseBrowser } from '@/lib/supabaseClient';

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
            if (data.isGlobalPaused !== undefined) {
              isGlobalPaused.value = data.isGlobalPaused;
            }
          }
        })
        .catch((err) => console.log('Session Check:', err));
    }

    // Global Supabase Realtime subscription for instant global pause/resume across all tabs
    const globalChannel = supabaseBrowser
      .channel('global-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.key === 'paused') {
            isGlobalPaused.value = rec.value === '1';
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(globalChannel);
    };
  }, []);

  return null;
};

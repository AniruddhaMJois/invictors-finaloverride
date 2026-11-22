'use client';

import { useEffect, useRef } from 'react';

export function useAntiCheat(onViolationDetected: () => void) {
  const hiddenStartTime = useRef<number | null>(null);
  const mountTime = useRef<number>(Date.now());
  const lastViolationReport = useRef<number>(0);

  useEffect(() => {
    mountTime.current = Date.now();

    function handleHidden() {
      if (!hiddenStartTime.current) {
        hiddenStartTime.current = Date.now();
      }
    }

    async function handleVisible() {
      if (!hiddenStartTime.current) return;
      const duration = Date.now() - hiddenStartTime.current;
      hiddenStartTime.current = null;

      const timeSinceMount = Date.now() - mountTime.current;
      // Ignore first 3s after load
      if (timeSinceMount < 3000) return;

      // Check if hidden/blurred for more than 1.5s
      if (duration >= 1500) {
        const now = Date.now();
        // At most one report per 10s
        if (now - lastViolationReport.current < 10000) return;
        lastViolationReport.current = now;

        try {
          const res = await fetch('/api/violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            onViolationDetected();
          }
        } catch (e) {
          console.error('Violation Report Error:', e);
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        handleHidden();
      } else {
        handleVisible();
      }
    }

    function onBlur() {
      handleHidden();
    }

    function onFocus() {
      handleVisible();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [onViolationDetected]);
}

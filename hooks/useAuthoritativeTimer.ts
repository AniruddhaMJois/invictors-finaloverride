'use client';

import { useEffect } from 'react';
import { teamState, serverClockOffset, isGlobalPaused } from '@/store';

export function useAuthoritativeTimer(
  textNodeRef: { current: HTMLElement | null },
  ringCircleRef?: { current: SVGCircleElement | null }
) {
  useEffect(() => {
    const interval = setInterval(() => {
      const state = teamState.value;
      if (!state || !state.startTime || !textNodeRef.current) return;

      const offset = serverClockOffset.value;
      const now = state.endTime || (isGlobalPaused.value ? state.serverNow : Date.now() + offset);
      const elapsedMs = Math.max(0, now - state.startTime);
      const totalElapsedSec = Math.floor(elapsedMs / 1000);

      const mins = Math.floor(totalElapsedSec / 60);
      const secs = totalElapsedSec % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // DIRECT TEXT NODE UPDATE (Zero React Re-render)
      if (textNodeRef.current.firstChild) {
        textNodeRef.current.firstChild.nodeValue = formatted;
      } else {
        textNodeRef.current.textContent = formatted;
      }

      // Update 90-min cap ring if ref supplied (5400s)
      if (ringCircleRef && ringCircleRef.current) {
        const hardCap = 5400;
        const remaining = Math.max(0, hardCap - totalElapsedSec);
        const fraction = remaining / hardCap;
        const circumference = 2 * Math.PI * 22; // r=22
        ringCircleRef.current.style.strokeDashoffset = String(circumference * (1 - fraction));

        if (remaining <= 120) {
          // Last 2 mins: red pulse
          ringCircleRef.current.style.stroke = 'var(--bad)';
          textNodeRef.current.style.color = 'var(--bad)';
        } else if (remaining <= 600) {
          // Last 10 mins: amber
          ringCircleRef.current.style.stroke = 'var(--amber)';
          textNodeRef.current.style.color = 'var(--amber)';
        } else {
          ringCircleRef.current.style.stroke = 'var(--accent)';
          textNodeRef.current.style.color = 'var(--txt)';
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [textNodeRef, ringCircleRef]);
}

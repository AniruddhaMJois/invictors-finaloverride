import { useEffect } from 'react';
import { teamState, serverClockOffset, isGlobalPaused } from '../store';

export function useAuthoritativeTimer(
  textNodeRef: { current: HTMLElement | null },
  ringCircleRef?: { current: SVGCircleElement | null }
) {
  useEffect(() => {
    let lastElapsedSec = 0;

    const interval = setInterval(() => {
      const state = teamState.value;
      if (!state || !state.startTime || !textNodeRef.current) return;

      const offset = serverClockOffset.value;
      const isTeamPaused = Boolean(state.isTeamPaused);
      const isPaused = Boolean(isGlobalPaused.value || isTeamPaused || state.isPaused);
      const currentNow = state.endTime ? state.endTime : (Date.now() + offset);

      let totalElapsedSec = 0;

      if (isPaused && !state.endTime) {
        // Paused state: calculate frozen elapsed time exactly matching gameEngine
        const totalGlobalPausedMs =
          (state.globalPausedAccumMs || 0) +
          (isGlobalPaused.value && state.globalPausedAt
            ? Math.max(0, currentNow - state.globalPausedAt)
            : 0);

        const totalTeamPausedMs =
          (state.pausedAccumMs || 0) +
          (isTeamPaused && state.pausedAt
            ? Math.max(0, currentNow - state.pausedAt)
            : 0);

        const totalPausedMs = totalGlobalPausedMs + totalTeamPausedMs;

        if (totalPausedMs > 0) {
          const elapsedMs = Math.max(0, currentNow - state.startTime - totalPausedMs);
          totalElapsedSec = Math.floor(elapsedMs / 1000);
        } else if (lastElapsedSec > 0) {
          // If paused timestamps are syncing, freeze at last elapsed second
          totalElapsedSec = lastElapsedSec;
        } else {
          const elapsedMs = Math.max(0, (state.serverNow || currentNow) - state.startTime);
          totalElapsedSec = Math.floor(elapsedMs / 1000);
        }
      } else {
        // Running or completed state
        const totalGlobalPausedMs = state.globalPausedAccumMs || 0;
        const totalTeamPausedMs = state.pausedAccumMs || 0;
        const totalPausedMs = totalGlobalPausedMs + totalTeamPausedMs;

        const elapsedMs = Math.max(0, currentNow - state.startTime - totalPausedMs);
        totalElapsedSec = Math.floor(elapsedMs / 1000);
      }

      lastElapsedSec = totalElapsedSec;

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

        if (isPaused) {
          ringCircleRef.current.style.stroke = 'var(--gold)';
          textNodeRef.current.style.color = 'var(--gold)';
        } else if (remaining <= 120) {
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
      } else if (isPaused) {
        textNodeRef.current.style.color = 'var(--gold)';
      }
    }, 250);

    return () => clearInterval(interval);
  }, [textNodeRef, ringCircleRef]);
}

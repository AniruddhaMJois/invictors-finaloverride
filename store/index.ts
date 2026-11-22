import { useSyncExternalStore } from 'react';
import { TeamState, LeaderboardEntry } from '@/shared/types';

export interface Signal<T> {
  value: T;
  subscribe: (listener: () => void) => () => void;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let val = initialValue;
  const listeners = new Set<() => void>();

  return {
    get value() {
      return val;
    },
    set value(newVal: T) {
      val = newVal;
      listeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error('Signal listener error:', e);
        }
      });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export function useSignal<T>(signal: Signal<T>): T {
  return useSyncExternalStore(
    signal.subscribe,
    () => signal.value,
    () => signal.value
  );
}

export const teamState = createSignal<TeamState | null>(null);
export const serverClockOffset = createSignal<number>(0);
export const isGlobalPaused = createSignal<boolean>(false);
export const submitCooldown = createSignal<number>(0); // 0 to 1
export const leaderboardData = createSignal<LeaderboardEntry[]>([]);
export const isWsConnected = createSignal<boolean>(false);

export interface ToastMessage {
  id: string;
  type: 'ok' | 'bad' | 'info' | 'gold';
  text: string;
}
export const toasts = createSignal<ToastMessage[]>([]);

export function showToast(text: string, type: 'ok' | 'bad' | 'info' | 'gold' = 'ok') {
  const id = Math.random().toString(36).substring(2, 9);
  toasts.value = [...toasts.value, { id, type, text }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 2400); // exactly 2.4s per spec
}

// WebSocket Manager
class WSManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private backoff = 1000;
  private listeners = new Map<string, Set<(data: any) => void>>();

  on(type: string, cb: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(cb);
    return () => {
      this.listeners.get(type)?.delete(cb);
    };
  }

  sendAuth(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', token }));
    }
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.warn('WebSocket connection init failed, will retry:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      isWsConnected.value = true;
      this.backoff = 1000;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state:update') {
          teamState.value = msg.state;
        } else if (msg.type === 'game:start') {
          if (teamState.value) {
            teamState.value = {
              ...teamState.value,
              gameStarted: true,
              startTime: msg.startedAt || Date.now()
            };
          }
        } else if (msg.type === 'game:standby') {
          if (teamState.value) {
            teamState.value = {
              ...teamState.value,
              gameStarted: false,
              startTime: null
            };
          }
        } else if (msg.type === 'pause:on') {
          isGlobalPaused.value = true;
        } else if (msg.type === 'pause:off') {
          isGlobalPaused.value = false;
        } else if (msg.type === 'leaderboard:update') {
          leaderboardData.value = msg.leaderboard;
        } else if (msg.type === 'time:sync') {
          const clientNow = Date.now();
          serverClockOffset.value = msg.serverNow - clientNow;
          isGlobalPaused.value = !!msg.isPaused;
        }

        const cbs = this.listeners.get(msg.type);
        if (cbs) {
          cbs.forEach((cb) => {
            try {
              cb(msg);
            } catch (err) {
              console.error('WS listener error:', err);
            }
          });
        }
      } catch (e) {
        console.error('WS Parse Error:', e);
      }
    };

    this.ws.onclose = () => {
      isWsConnected.value = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (typeof window === 'undefined') return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.backoff = Math.min(10000, this.backoff * 1.5);
      this.connect();
    }, this.backoff);
  }
}

export const wsManager = new WSManager();

// Fetch server time and calculate clock offset
export async function syncServerTime(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const t0 = Date.now();
    const res = await fetch('/api/time');
    const data = await res.json();
    const t1 = Date.now();
    const latency = (t1 - t0) / 2;
    const serverNow = data.serverNow + latency;
    serverClockOffset.value = serverNow - Date.now();
    isGlobalPaused.value = data.isPaused;
    return serverClockOffset.value;
  } catch (err) {
    console.error('Time Sync Error:', err);
    return 0;
  }
}

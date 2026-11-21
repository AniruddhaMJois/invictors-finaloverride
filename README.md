# 🎯 FINAL OVERRIDE — 6-Stage Escape Room Web App

**FINAL OVERRIDE** is a timed, competitive 6-stage cybersecurity and logic escape-room web application built for the **Invictors Club**, Dept. of Computer Science & Engineering, Vidyavardhaka College of Engineering (VVCE), Mysuru.

---

## ⚡ Quick Start (One Command)

```bash
# 1. Install all dependencies and build client bundle
npm run setup

# 2. Start server (Serves Client, REST API and WebSockets on 0.0.0.0:3000)
npm start
```

On startup, the server automatically detects your network interface and prints:
```
========================================================
🚀 FINAL OVERRIDE Server Online
📡 Local:   http://localhost:3000
🌐 LAN URL: http://192.168.1.X:3000
🔐 Admin PIN: INVICTORS@23
⚡ Hard Cap:  5400 seconds (90 minutes)
========================================================
```

---

## 🛠️ Architecture & Stack

### Client
- **Framework:** Vite + TypeScript + Preact (tiny bundle, sub-millisecond reactivity)
- **State:** Preact Signals (`@preact/signals`) with zero boilerplate
- **Routing:** URL-synced popstate router with zero external routing overhead
- **Design System:** Pure CSS custom properties (no heavy external UI libraries)
- **Bundle Size Budget:**
  - `dist/index.html`: 0.69 kB (0.42 kB gzipped)
  - `dist/assets/index.css`: 7.27 kB (2.43 kB gzipped)
  - `dist/assets/index.js`: **89.47 kB (27.37 kB gzipped)** — *Well under the 150 KB limit!*
- **Offline Guarantee:** 100% offline on college LAN (zero external CDNs, Google Fonts, or remote assets)

### Server
- **Runtime:** Node.js 20 + Express
- **Real-Time:** `ws` WebSocket Server (`/ws`) with 15s heartbeat ping/pong
- **Database:** SQLite with WAL mode (`PRAGMA journal_mode = WAL;`)
- **In-Memory Cache:** Ultra-low latency memory cache with write-through SQLite transactions (p95 < 50ms)
- **Security:** HMAC-SHA256 signed `device_token` in httpOnly SameSite cookies; constant-time PIN checks

---

## 📡 Stage 1: Signal Intercept (4-Sector Morse Matrix)

- **Concept:** An interactive audio-visual frequency grid that intercepts 4 vault communication sectors.
- **The Four Sectors:**
  1. **Sector 1 (Oscilloscope / Pulse Graph):** Animated canvas phosphor trace with 700 Hz audio pulses representing `—•` (Morse `N`).
  2. **Sector 2 (Binary Telemetry Feed):** Monospace scrolling data stream highlighting `111-111-111` representing 3 dashes `———` (Morse `O`). Includes a freeze toggle.
  3. **Sector 3 (Optical Strobe Beacon):** Amber strobe lamp flashing 3 short then 1 long `•••—` (Morse `V`). Includes loop toggle.
  4. **Sector 4 (Satellite Relay Feed):** Spectrogram pulse visualizer with 700 Hz carrier wave audio representing `•—` (Morse `A`).
- **Timing Standards:**
  - 1 Unit = 0.22 s (220 ms)
  - Dot = 1 unit (0.22 s), Dash = 3 units (0.66 s), Gap between symbols = 1 unit (0.22 s), Lead-in = 0.20 s
- **Audio Fallback:**
  - Served from `server/assets/stage1/` only while team is on Stage 1.
  - If audio loading fails or device blocks autoplay, the client synthesizes identical 700 Hz sine waves with 4 ms linear ramps using the Web Audio API.
  - Visuals stay in sync with audio and allow silent completion.
- **Decoy Trap:**
  - Red flashing banner `⚠️ ANOMALY DETECTED: FREQ-ZETA9` appears for 1.2s every 6s.
  - Submitting `ZETA9` counts as a wrong attempt and displays: *"⚠️ That is the anomaly decoy! Not quite, try again 🙂"*.
- **Decode Pad:**
  - 4 small personal aid boxes (S1, S2, S3, S4) auto-saved and synced across team devices in real-time.
- **Target Answer:** `NOVA` (case-insensitive, normalized).

---

## 🎨 Design System Tokens

Tokens are defined on `:root`:
- `--bg: #030813`, `--bg2: #061226`, `--card: #08142c`, `--line: #1d4f8f`
- `--txt: #e8f1ff`, `--muted: #8fa8c8`, `--accent: #27b4ff` (neon blue), `--cyan: #6fe3ff`
- `--gold: #ffb81f`, `--amber: #ff9a1f`, `--ok: #34d399`, `--bad: #ff5d6c`

### Accessibility
- `prefers-reduced-motion` immediately disables animations, shimmers, and canvas oscillation.
- All canvases pause when scrolled out of view via `IntersectionObserver`.

---

## 🔒 Security & Anti-Cheat Defaults

1. **Tab-Switch Detection:**
   - Triggered if blurred/hidden for > 1.5 seconds: **+2 minutes (120s)** penalty.
   - Debounced: Max one violation per 10s; 3s grace period on initial load.
2. **Submit Rate Limiting:**
   - 1-second cooldown between answer submits (HTTP 429).
3. **Server-Authoritative Clock:**
   - Server clock synchronization via `GET /api/time`. Timer updates direct DOM text node every 250ms with 0 component re-renders.
4. **Content Gating:**
   - Stage 1 API (`/api/stage/1` and `/api/stage/1/assets/*`) returns HTTP 403 if the requesting squad is on Stage 2 or later.

---

## 🧪 Automated Test Suite

To run all 14 automated tests:
```bash
npm test
```

### Verified Test Cases:
1. ✅ **Registration Validation:** Rejects <3 members, duplicate member names, duplicate team names, invalid coordinator.
2. ✅ **Authoritative Timer:** Server-side elapsed calculation with pause adjustments.
3. ✅ **Hint System:** +180s (Hint 1) and +300s (Hint 2) penalties, 30s countdown ring, permanent masking after expiry.
4. ✅ **Anti-Cheat:** +120s penalty with 10s debounce and 3s startup grace period.
5. ✅ **Rate Limiting:** 1s cooldown returns HTTP 429 on rapid submission.
6. ✅ **Full Sequential Progression:** Validates Stages 1–6 through the final key `FO{91X-7K2-HEX82D-TIBRO-NOVA}#29` and 8-character verification hash.
7. ✅ **Global Pause & Resume:** Clocks freeze without losing elapsed time.
8. ✅ **Leaderboard Sorting:** Overridden teams first by final rank time, then active teams by highest stage and lowest time.
9. ✅ **Secret Protection:** Guarantees zero solution keys leak into client JSON payloads.
10. ✅ **Stage 1 Content Gating:** Returns 403 Forbidden for teams that have completed or advanced past Stage 1.
11. ✅ **Stage 1 Decoy Trap:** Identifies and counts `ZETA9` decoy submissions with customized feedback.
12. ✅ **Stage 1 Hint 1 Chart:** Validates full 15-character international Morse code chart, 30s countdown, and persistence after reload.
13. ✅ **Stage 1 Audio Scheduler:** Mathematical verification of unit durations (0.22s unit, 0.66s dash, 0.22s gaps, 0.20s lead-in).
14. ✅ **Stage 1 Decode Pad:** Real-time persistence and multi-device squad synchronization.

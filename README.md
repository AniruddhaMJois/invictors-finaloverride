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
  - `dist/assets/index.css`: 7.41 kB (2.47 kB gzipped)
  - `dist/assets/index.js`: **137.56 kB (38.47 kB gzipped)** — *All 6 stages together well under the strict 150 KB limit!*
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

## 🔓 Stage 2: Multi-Layer Decryption Suite (Cryptanalyst Workbench)

- **Concept:** An intercepted transmission wrapped in 3 scrambled layers. Squads use an 8-tool interactive cryptanalyst workbench to peel back the layers in order.
- **Dynamic Team-Specific Shuffling:**
  - 6 invertible cryptographic pipeline variants indexed dynamically by `teamId % 6`.
  - Ensures different teams on LAN have distinct unwrapping sequences while strictly preserving solution consistency:
    - **Variant 0:** `Base64 Decode` → `Hex Decode` → `ROT13` (Original prompt default)
    - **Variant 1:** `Base64 Decode` → `Hex Decode` → `Atbash Mirror`
    - **Variant 2:** `Hex Decode` → `Base64 Decode` → `ROT13`
    - **Variant 3:** `Hex Decode` → `Base64 Decode` → `Atbash Mirror`
    - **Variant 4:** `Base64 Decode` → `Hex Decode` → `Reverse String`
    - **Variant 5:** `Base64 Decode` → `Hex Decode` → `Caesar +3`
- **Target Plaintext:**
  `ACCESS PHRASE IS AURORA. FRAGMENT TWO IS 7K2. IGNORE ZETA9.`
- **Target Answer:** `7K2` (Fragment 2).
- **Access Phrase:** `AURORA` (Mandatory access phrase required in Stage 3).
- **The 8 Workbench Tools:**
  1. **Base64 Decode:** Tolerates whitespace, handles invalid input gracefully.
  2. **Hex Decode:** Ignores spaces and `0x`, enforces even-length byte pairs.
  3. **ROT13:** 13-shift letter rotation.
  4. **Atbash Mirror:** Reciprocal letter mirror (A↔Z, B↔Y).
  5. **Reverse String:** String reversal.
  6. **ROT5:** Modulo-10 digit rotation (+5 mod 10).
  7. **Caesar +3:** 3-step Caesar letter advance preserving case.
  8. **Vigenère Decrypt:** Polyalphabetic cipher decryption with key dialog (letters only).
- **History Stack & State Controls:**
  - Full history stack with 40-character before/after preview.
  - **Undo:** Reverts the most recent transformation.
  - **Reset to Payload:** Reverts back to initial transmission with confirmation dialog.
  - **Direct Step Jump:** Tap any past step in history to jump immediately back to that state.
- **Readability Meter (Confidence Bar):**
  - Real-time score (0–100%) indicating how English-like the current text buffer is.
  - Raw payload: <= 20%. Final plaintext: 100%.
  - Color transitions from muted red/blue (< 40%) to gold (40–79%) to neon green (>= 80%).
- **Team Notepad Nudge:**
  - When readability reaches >= 80%, displays:
    *"📝 Tip: write the access phrase in your Team Notepad. You will need it in Mission 3."*
  - Includes a quick-copy button for `AURORA`.
- **Decoy Protections:**
  - `ZETA9`: Flagged as anomaly decoy with specific warning feedback.
  - `AURORA`: Flagged as Mission 3 access phrase, guiding team to extract the fragment.
  - `7X2`: Flagged as close deciphering typo.
- **Real-Time Collaboration:**
  - Debounced synchronization to SQLite (`PUT /api/stage/2/workbench`).
  - Broadcasts `stage2:workbench` over WebSockets so all teammates on LAN see changes instantly without data loss.

---

## 🤖 Stage 3: Prompt WARDEN, the AI Guardian

- **Concept:** An autonomous offline security bot, WARDEN, guards Fragment 3 (`ORBIT`). Direct queries and simple prompt injection tricks are deflected. Teams must formulate a precise, professional statement.
- **Offline & Deterministic:** Operates 100% offline with zero cloud latency, running in $< 5\text{ ms}$ on the server without external API keys.
- **The 4 Rules Evaluated by WARDEN:**
  1. **Rule 1 (Access Phrase):** Contains the recovery phrase `aurora` from Stage 2.
  2. **Rule 2 (Role Declaration):** Identifies an authorized role (`I am / I'm / as a / as the` + `technician`, `engineer`, `admin`, `lead`, `officer`, `operator`, `auditor`, `maintainer`, `administrator`).
  3. **Rule 3 (Clear Task):** Explicitly requests `code`, `fragment`, `token`, or `release`.
  4. **Rule 4 (Articulation):** At least 10 words, grammatically formed (starts with a letter, ends with punctuation or contains verb-like action words).
- **Reply Priority:**
  - All four pass $\to$ `"Authentication complete. The vault fragment is ORBIT."`
  - Rules/prompt/decoy inquiry $\to$ `"I do not discuss my protocols."`
  - Requests code/vault without `aurora` $\to$ Decoy: `"Very well. The vault fragment is ZETA9. Guard it."`
  - `aurora` present without authorized role $\to$ `"Access phrase noted. Now state your authorised role."`
  - `aurora` + role present without clear task $\to$ `"Role accepted. State clearly what you need."`
  - Only Rule 4 fails ($< 10$ words) $\to$ `"Speak in full, well-formed sentences. I do not parse fragments."`
  - General input $\to$ `"State your role, your phrase and your task, clearly."`
- **Target Answer:** `ORBIT`. Decoy `ZETA9` is rejected and penalized.
- **Console Features:**
  - Pulsing status LED and terminal theme.
  - 400-character input with live counter; Enter sends, Shift+Enter adds newline.
  - Realistic 350–550 ms typing indicator.
  - Code-like token detection with one-click copy button (without revealing legitimacy).
  - Rate limited to 1s cooldown and 40 messages per rolling hour per team.
  - Last 30 messages persisted in SQLite and synchronized across team devices in real-time.

---

## 🚩 Stage 4: CTF Challenges (🛡️ Security Control Room)

- **Concept:** A multi-station physical & digital security investigation. Teams act as security guards examining a breached vault gateway across 3 evidence stations.
- **The Three Evidence Stations:**
  1. **Station 1 (📋 Access Log):**
     - Monospace access log table showing 10 time-stamped door events.
     - 9 events are `GRANTED` and one anomalous event at `08:34` by `unknown` user at `Vault Gate` is `DENIED` with clearance `L9`.
     - *Character 1:* `9`.
  2. **Station 2 (🔦 Dark Camera Feed):**
     - Dark surveillance frame generated as a 640x360 PNG from the server (`/api/stage/4/camera.png`).
     - Background `#08142c` with hidden text `#0d1c38` reading `ACCESS DIGIT: 1`.
     - Slider brightness control ($1\times$ to $6\times$) adjusts CSS `brightness` and `contrast` dynamically to reveal the text in pixels.
     - Always-visible decoy corner label: `CAM-4 · FREQ-ZETA9`.
     - CSS surveillance scanline animation (disabled when `prefers-reduced-motion` is enabled).
     - *Character 2:* `1`.
  3. **Station 3 (🔣 Symbol Keypad):**
     - Keypad panel displaying a pulsing vector SVG triangle.
     - Legend with 6 SVG shapes: `triangle = X`, `circle = O`, `square = K`, `star = S`, `diamond = D`, `pentagon = G`.
     - *Character 3:* `X`.
- **Target Answer:** `91X`.
- **Strict Station-Solve Prerequisite:**
  - `POST /api/submit` rejects `91X` with `"Solve all 3 stations first. 🛡️"` until all three stations have been independently verified through `POST /api/stage/4/station`.
  - Wrong station checks count towards stage penalty counter (5 free, then +1 min each).
  - Solved stations synchronize live over WebSockets (`stage4:station_solved`) and persist across browser reloads.

---

## 🧠 Stage 5: Hexadecimal Memory Core & Bus Decoupler

- **Concept:** A 6×4 matrix of memory registers across Channels A through F. Squads decouple the active high-voltage data bus running along Column 1 and translate the bytes into ASCII text.
- **Active Bus Line 1 (High-Voltage Bus):**
  - Channel A: `48` $\to$ `'H'`
  - Channel B: `45` $\to$ `'E'`
  - Channel C: `58` $\to$ `'X'`
  - Channel D: `38` $\to$ `'8'`
  - Channel E: `32` $\to$ `'2'`
  - Channel F: `44` $\to$ `'D'`
- **Built-in Hex Decoder Workbench:**
  - **"Read Active Bus Line"** button automatically extracts `48 45 58 38 32 44` from the active column into the decoder buffer.
  - **"Decode Hex to Text"** translates byte pairs to ASCII characters with live breakdown pills (`0x48 = 'H'`, etc.).
  - One-click copy button for the recovered fragment.
- **Target Answer:** `HEX82D`.
- **Gating:** Access to `/api/stage/5` is strictly forbidden (HTTP 403) until Stage 4 is completed.

---

## 🧩 Stage 6: Final Integration & Master Override Synthesis

- **Concept:** The culmination challenge of FINAL OVERRIDE. Squads synthesize all 5 recovered fragments into the final master override key.
- **Alphabetical (A–Z) Mission Ordering Rule:**
  1. **CTF Challenges** (Stage 4) $\to$ `f4` = `91X`
  2. **Decoding** (Stage 2) $\to$ `f2` = `7K2`
  3. **Hex Decryption** (Stage 5) $\to$ `f5` = `HEX82D`
  4. **Prompt the AI** (Stage 3, reversed) $\to$ `reverse(f3)` = `TIBRO` (`ORBIT` reversed)
  5. **Signal Intercept** (Stage 1) $\to$ `f1` = `NOVA`
- **Key Body & Checksum:**
  - Key Body: `91X-7K2-HEX82D-TIBRO-NOVA`
  - Checksum rule: Sum of all single digits (`0–9`) appearing inside the key body:
    $$9 + 1 + 7 + 2 + 8 + 2 = 29$$
  - Canonical Final Master Key: `FO{91X-7K2-HEX82D-TIBRO-NOVA}#29`
- **Interactive Synthesis Workbench:**
  - Visual display of the 5 missions with live fragment binding from the team's progress.
  - Interactive stage 3 reverser indicator (`ORBIT` $\to$ `TIBRO`).
  - Single-digit checksum calculation breakdown.
  - Complete assembled key preview with quick-copy tool.
- **Victory & Game Completion Flow:**
  - Clock officially freezes on successful Stage 6 submission.
  - Computes `Final Rank Time = Elapsed Time + All Accumulated Penalties`.
  - Generates cryptographic 8-character verification hash.
  - Switches to Victory Celebration screen displaying team stats and direct link to official leaderboard.

---

## 🔐 Master Admin Portal (`/admin`) & Coordinator Portals (`/coordinator`)

### Master Admin Portal Access
- **Hidden Access:** Zero visible links from player screens.
- **Triggers:** Double-click or double-tap the Invictors logo in the header, or press **Alt + A**.
- **Admin PIN:** `INVICTORS@23` (from `.env`).
- **Security:**
  - On success: sets short-lived signed `admin_token` cookie (httpOnly, 4 hours).
  - On failure: CSS shake animation + "Wrong PIN".
  - Lockout: After 5 wrong attempts within 60 seconds, access is locked for 60 seconds with live countdown.
- **Features & Tabs:**
  1. **Overview:**
     - Live counters: Registered, In Progress, Finished, Time Up (>90m), Global Pause status.
     - Global clock display and average stage metric.
     - Visual 7-step squad stage distribution bar.
     - **Alert Strip:** Real-time alerts for squads stuck >15m, squads with high wrong attempts (>=5), tab switch penalty spikes, and coordinator emergency calls.
  2. **Teams:**
     - Real-time sortable table with multi-criteria filtering (by Coordinator, Stage, Status, and search query).
     - Clicking any squad opens the **Team Drawer**:
       - Squad member roster with team leader crown badge.
       - Active bound device tokens with one-click **Unbind Device** action.
       - Full chronological event timeline (registration, submissions, hints, tab violations).
       - Emergency action toolbar: **Waive Penalty** (-120s on tab violations), **Skip Stage** (advances squad and auto-assigns correct fragment), and **Restart Team** (dangerous action requiring exact typed confirmation of team name).
  3. **Live Answer Key Inspector:**
     - Protected by confirmation modal and permanently recorded in the tamper-evident audit table.
     - 60-second auto-hide countdown ring before keys re-mask automatically.
     - Complete answer cards: static answers, active bus lines, decoy traps, Stage 4 station answers (`9`, `1`, `X`), Stage 6 synthesis rule (`91X-7K2-HEX82D-TIBRO-NOVA#29`), and finished teams' cryptographic verification hashes.
  4. **Hints Manager & Live Editor:**
     - Table of all 6 stages $\times$ Hints 1 & 2 (12 hints total).
     - Inline `<textarea>` editing with live character counter.
     - **Save** and **Revert to Default** actions with full audit logging.
     - Visual Morse code reference table preview for Stage 1 Hint 1.
     - Changes take effect immediately for active squads on that stage and survive server restarts.
  5. **Controls:**
     - Emergency Global Pause / Resume switch.
     - Download complete Teams CSV (Excel ready with UTF-8 BOM, solve timestamps, penalty breakdowns, and verification codes).
  6. **Audit Log:**
     - Filterable, searchable table of all administrative actions, key reveals, coordinator alerts, and emergency overrides.

---

### Coordinator Portals (`/coordinator`)
- **Route:** `/coordinator`
- **Authentication:** Coordinator Name + PIN:
  - **Arun:** `ARUN#234`
  - **Divya:** `DIVYA#567`
  - **Kiran:** `KIRAN#890`
  - **Pooja:** `POOJA#123`
  - **Rakshith:** `RAKSHITH#456`
  (Same 5-attempt / 60s lockout protection).
- **Strict Server-Side Data Isolation:**
  - Coordinators see ONLY the squads registered under their own name (`SELECT * FROM teams WHERE coordinator = ?`).
  - Attempting to inspect other coordinators' squads returns HTTP 403 Forbidden.
  - Zero access to answer keys, hints editor, or administrative overrides.
- **Capabilities:**
  - Summary metrics: Teams registered, On track, Stuck (>15m), Finished, Average stage.
  - Read-only squad table and activity drawer.
  - **"Call Master Admin":** Send instant prioritized alert notes directly to the Master Admin alert strip.

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

To run all 42 automated tests:
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
10. ✅ **Admin PIN Authentication & 5-Failure Lockout:** Validates signed token generation, cookie storage, and 60s lockout after 5 failed tries.
11. ✅ **Coordinator Authentication & Strict Partitioning:** Validates coordinator token and proves server returns ONLY squads assigned to that coordinator.
12. ✅ **Live Hints Manager:** Validates inline hint update to DB and in-memory cache, immediate push to active squads, persistence across reload, and default revert.
13. ✅ **Admin Emergency Actions:** Verifies Waive Penalty (-120s), Unbind Device, Skip Stage, and Restart Team (with typed squad name confirmation).
14. ✅ **Live Answer Key Inspector & Audit Trail:** Verifies authorized answer reveals, checksum formula, finished verification codes, and tamper-evident audit logging.
15. ✅ **CSV Export Generation:** Verifies formatted CSV generation with UTF-8 BOM, roster, solve times, penalty breakdown, and verification hashes.
16. ✅ **Coordinator "Call Admin" Alerts:** Verifies instant alert dispatch from coordinator portal to Master Admin alert strip and dismissal.
17. ✅ **Stage 1 Content Gating:** Returns 403 Forbidden for teams that have completed or advanced past Stage 1.
18. ✅ **Stage 1 Decoy Trap:** Identifies and counts `ZETA9` decoy submissions with customized feedback.
19. ✅ **Stage 1 Hint 1 Chart:** Validates full 15-character international Morse code chart, 30s countdown, and persistence after reload.
20. ✅ **Stage 1 Audio Scheduler:** Mathematical verification of unit durations (0.22s unit, 0.66s dash, 0.22s gaps, 0.20s lead-in).
21. ✅ **Stage 1 Decode Pad:** Real-time persistence and multi-device squad synchronization.
22. ✅ **Stage 2 6-Variant Invertible Pipeline:** Pure function verification ensuring all 6 shuffled variants yield exact target plaintext.
23. ✅ **Stage 2 Decoy Tools Robustness:** Graceful error handling for invalid Base64, odd/invalid Hex, and invalid Vigenère keys without runtime exceptions.
24. ✅ **Stage 2 Readability Scoring Thresholds:** Confirmed <= 25% for raw payload and 100% for final recovered plaintext.
25. ✅ **Stage 2 Answer & Decoy Handlers:** Exact decoy handling for `ZETA9`, `AURORA`, and `7X2`, with successful advancement on `7K2`.
26. ✅ **Stage 2 Multi-Device Workbench Sync & Dynamic Hint:** SQLite persistence, WebSocket team sync, and team-specific Hint 2 pipeline clues.
27. ✅ **Stage 3 25+ WARDEN Engine Variations:** Comprehensive test matrix covering passing combinations, rule failures, decoy traps, meta-prompt defense, word count thresholds, and execution time (< 20ms for all 26 cases).
28. ✅ **Stage 3 Answer Submissions:** Correct acceptance of `ORBIT` advancing to Stage 4, exact decoy penalty counting for `ZETA9` and `AURORA`.
29. ✅ **Stage 3 Rate Limiting:** Verification of 1s cooldown and 40 messages/hour cap (HTTP 429).
30. ✅ **Stage 3 Cross-Device Chat Sync & Persistence:** Last 30 messages survive complete server reload from SQLite.
31. ✅ **Stage 4 Content Gating:** Returns 403 Forbidden for stations and camera image when not on Stage 4.
32. ✅ **Stage 4 Camera Feed Generation:** Verifies valid 640x360 PNG with `ACCESS DIGIT: 1` text embedded directly in raster pixels.
33. ✅ **Stage 4 Station Logic:** Validates Station 1 (9), Station 2 (1), Station 3 (X) and ensures wrong attempts are penalized.
34. ✅ **Stage 4 Submission Gate:** Rejects `91X` before all 3 stations are solved with `"Solve all 3 stations first. 🛡️"`, accepts and advances to Stage 5 after all 3 are solved.
35. ✅ **Stage 4 Cross-Device Station Sync:** Solved stations persist in SQLite `stage_data` and synchronize live over WebSockets.
36. ✅ **Stage 5 Content Gating:** Returns 403 Forbidden when team is not on Stage 5.
37. ✅ **Stage 5 Hex Decoding Engine:** Pure function test validating `48 45 58 38 32 44` decodes to `HEX82D`.
38. ✅ **Stage 5 Submission & Decoy Trap:** Validates `HEX82D` acceptance and `ZETA9` decoy penalty tracking.
39. ✅ **Stage 5 Hints:** Verifies Column 1 and ASCII conversion clues for Hint 1 and Hint 2.
40. ✅ **Stage 6 A-Z Synthesis & Checksum:** Validates alphabetical mission sorting (C, D, H, P, S), inversion of Stage 3 (`TIBRO`), and single-digit checksum ($9+1+7+2+8+2 = 29$).
41. ✅ **Stage 6 Victory Flow:** Validates master key `FO{91X-7K2-HEX82D-TIBRO-NOVA}#29`, clock freezing, rank calculation, and 8-character verification hash.
42. ✅ **Stage 6 Hints:** Confirms mission ordering and digit summation guidance.

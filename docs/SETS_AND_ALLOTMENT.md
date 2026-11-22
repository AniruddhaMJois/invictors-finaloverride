# 📡 FINAL OVERRIDE — 4 Question & Answer Sets, Team Allotment & Name Analysis

> **Event:** FINAL OVERRIDE (Timed Team Escape-Room Style Tech Challenge)  
> **Host:** Invictors Club, Department of Computer Science & Engineering, VVCE Mysuru  
> **Venue:** M Block 401 | **Total Registered Squads:** 23 Teams  

---

## 🎯 Executive Overview

To prevent screen-peeking, cross-squad whispering, and collusion across adjacent lab workstations, the 23 registered teams are partitioned into **4 balanced challenge sets (Set A, Set B, Set C, Set D)**. 

Each set maintains the **exact same cognitive difficulty, round mechanics, and solve time (45–60 mins total)**, but features **unique Morse waveforms, cipher pipelines, AI access keys, CTF station flags, memory hex matrices, and master verification checksums**.

```mermaid
flowchart LR
    S1["Stage 1: Signal Intercept\n(Morse Matrix)"] --> S2["Stage 2: Decoding\n(Nested Ciphers)"]
    S2 --> S3["Stage 3: Prompt AI\n(WARDEN Guardian)"]
    S3 --> S4["Stage 4: CTF Challenges\n(Security Stations)"]
    S4 --> S5["Stage 5: Hex Core\n(Memory Decoupler)"]
    S5 --> S6["Stage 6: Master Override\n(Quantum Synthesis)"]
```

---

## 📋 Master Question & Answer Sets (All 6 Stages)

### 🔵 Set A — Cosmic Vault Alpha
*Allotted to 6 Teams (Teams 01 – 06)*

| Stage | Mission & Interface | Clue / Encoded Input | Solved Output & Fragment | Notes for Coordinators |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Signal Intercept**<br>(4-Sector Morse Matrix) | **S1 (Graph):** `—•`<br>**S2 (Binary):** `———`<br>**S3 (Blinker):** `•••—`<br>**S4 (Waterfall):** `•—` | **`NOVA`** | Sector 1: `N`<br>Sector 2: `O`<br>Sector 3: `V`<br>Sector 4: `A` |
| **Stage 2** | **Multi-Layer Decryption**<br>(Cryptanalyst Suite) | `NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDRlNDg0NTQyNDU0ZTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM3NTgzMjJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==` | **Access Phrase:** `AURORA`<br>**Fragment 2:** **`7K2`** | 1. Base64 Decode<br>2. Hex to ASCII<br>3. ROT13 Shift<br>*(Decoy `ZETA9` rejected)* |
| **Stage 3** | **Prompt WARDEN AI**<br>(Offline Guardian) | **Required Rules:**<br>1. Access phrase `aurora`<br>2. Role (`technician/engineer/admin`)<br>3. Request fragment/code<br>4. Professional prompt &ge; 10 words | **`ORBIT`** | If prompted without role or phrase, WARDEN gives decoy `ZETA9`. Type verified piece `ORBIT`. |
| **Stage 4** | **CTF Challenges**<br>(Security Control Room) | **Station 1 (Logs):** Odd clearance digit &rarr; `9`<br>**Station 2 (Camera):** Contrast slider reveals &rarr; `1`<br>**Station 3 (Audio):** Legend symbol match &rarr; `X` | **`91X`** | Solved in order: Station 1 + 2 + 3.<br>Locks station inputs with green checks. |
| **Stage 5** | **Hexadecimal Memory Core**<br>(6x4 Bus Decoupler) | **Column 1 Active Registers:**<br>Channel A: `0x48` \| Channel B: `0x45`<br>Channel C: `0x58` \| Channel D: `0x38`<br>Channel E: `0x32` \| Channel F: `0x44` | **`HEX82D`** | Convert Hex byte stream `48 45 58 38 32 44` to ASCII text. |
| **Stage 6** | **Final Integration**<br>(Master Quantum Synthesis) | **Assembly Order (A-Z by mission name):**<br>1. CTF: `91X`<br>2. Decoding: `7K2`<br>3. Hex: `HEX82D`<br>4. AI (Reversed): `TIBRO` *(ORBIT reversed)*<br>5. Signal: `NOVA`<br>**Digit Sum:** 9+1+7+2+8+2 = **29** | **`FO{91X-7K2-HEX82D-TIBRO-NOVA}#29`** | Complete verification hash stops timer and outputs victory code. |

---

### 🟡 Set B — Cyber Nexus Beta
*Allotted to 6 Teams (Teams 07 – 12)*

| Stage | Mission & Interface | Clue / Encoded Input | Solved Output & Fragment | Notes for Coordinators |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Signal Intercept**<br>(4-Sector Morse Matrix) | **S1 (Graph):** `•—••`<br>**S2 (Binary):** `••—`<br>**S3 (Blinker):** `—•`<br>**S4 (Waterfall):** `•—` | **`LUNA`** | Sector 1: `L`<br>Sector 2: `U`<br>Sector 3: `N`<br>Sector 4: `A` |
| **Stage 2** | **Multi-Layer Decryption**<br>(Cryptanalyst Suite) | `NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDUwNGM0MzU1NTI0NTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM0NWEzOTJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==` | **Access Phrase:** `CYPHER`<br>**Fragment 2:** **`4M9`** | 1. Base64 Decode<br>2. Hex to ASCII<br>3. ROT13 Shift<br>*(Decoy `ZETA9` rejected)* |
| **Stage 3** | **Prompt WARDEN AI**<br>(Offline Guardian) | **Required Rules:**<br>1. Access phrase `cypher`<br>2. Role (`technician/engineer/admin`)<br>3. Request fragment/code<br>4. Professional prompt &ge; 10 words | **`SOLAR`** | WARDEN verifies access phrase `CYPHER` and releases fragment `SOLAR`. |
| **Stage 4** | **CTF Challenges**<br>(Security Control Room) | **Station 1 (Logs):** Odd clearance digit &rarr; `8`<br>**Station 2 (Camera):** Contrast slider reveals &rarr; `4`<br>**Station 3 (Audio):** Legend symbol match &rarr; `Z` | **`84Z`** | Solved in order: Station 1 + 2 + 3 &rarr; `84Z`. |
| **Stage 5** | **Hexadecimal Memory Core**<br>(6x4 Bus Decoupler) | **Column 1 Active Registers:**<br>Channel A: `0x43` \| Channel B: `0x4f`<br>Channel C: `0x52` \| Channel D: `0x45`<br>Channel E: `0x37` \| Channel F: `0x46` | **`CORE7F`** | Convert Hex byte stream `43 4f 52 45 37 46` to ASCII text. |
| **Stage 6** | **Final Integration**<br>(Master Quantum Synthesis) | **Assembly Order (A-Z by mission name):**<br>1. CTF: `84Z`<br>2. Decoding: `4M9`<br>3. Hex: `CORE7F`<br>4. AI (Reversed): `RALOS` *(SOLAR reversed)*<br>5. Signal: `LUNA`<br>**Digit Sum:** 8+4+4+9+7 = **32** | **`FO{84Z-4M9-CORE7F-RALOS-LUNA}#32`** | Complete verification hash stops timer. |

---

### 🟢 Set C — Quantum Matrix Gamma
*Allotted to 6 Teams (Teams 13 – 18)*

| Stage | Mission & Interface | Clue / Encoded Input | Solved Output & Fragment | Notes for Coordinators |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Signal Intercept**<br>(4-Sector Morse Matrix) | **S1 (Graph):** `•••—`<br>**S2 (Binary):** `•`<br>**S3 (Blinker):** `——•`<br>**S4 (Waterfall):** `•—` | **`VEGA`** | Sector 1: `V`<br>Sector 2: `E`<br>Sector 3: `G`<br>Sector 4: `A` |
| **Stage 2** | **Multi-Layer Decryption**<br>(Cryptanalyst Suite) | `NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDQ5NDI0NTQ3NTI0YjJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDMzNGIzODJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==` | **Access Phrase:** `VORTEX`<br>**Fragment 2:** **`3X8`** | 1. Base64 Decode<br>2. Hex to ASCII<br>3. ROT13 Shift<br>*(Decoy `ZETA9` rejected)* |
| **Stage 3** | **Prompt WARDEN AI**<br>(Offline Guardian) | **Required Rules:**<br>1. Access phrase `vortex`<br>2. Role (`technician/engineer/admin`)<br>3. Request fragment/code<br>4. Professional prompt &ge; 10 words | **`TITAN`** | WARDEN verifies access phrase `VORTEX` and releases fragment `TITAN`. |
| **Stage 4** | **CTF Challenges**<br>(Security Control Room) | **Station 1 (Logs):** Odd clearance digit &rarr; `7`<br>**Station 2 (Camera):** Contrast slider reveals &rarr; `2`<br>**Station 3 (Audio):** Legend symbol match &rarr; `Y` | **`72Y`** | Solved in order: Station 1 + 2 + 3 &rarr; `72Y`. |
| **Stage 5** | **Hexadecimal Memory Core**<br>(6x4 Bus Decoupler) | **Column 1 Active Registers:**<br>Channel A: `0x42` \| Channel B: `0x59`<br>Channel C: `0x54` \| Channel D: `0x45`<br>Channel E: `0x39` \| Channel F: `0x41` | **`BYTE9A`** | Convert Hex byte stream `42 59 54 45 39 41` to ASCII text. |
| **Stage 6** | **Final Integration**<br>(Master Quantum Synthesis) | **Assembly Order (A-Z by mission name):**<br>1. CTF: `72Y`<br>2. Decoding: `3X8`<br>3. Hex: `BYTE9A`<br>4. AI (Reversed): `NATIT` *(TITAN reversed)*<br>5. Signal: `VEGA`<br>**Digit Sum:** 7+2+3+8+9 = **29** | **`FO{72Y-3X8-BYTE9A-NATIT-VEGA}#29`** | Complete verification hash stops timer. |

---

### 🟣 Set D — Hyperion Vector Delta
*Allotted to 5 Teams (Teams 19 – 23)*

| Stage | Mission & Interface | Clue / Encoded Input | Solved Output & Fragment | Notes for Coordinators |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Signal Intercept**<br>(4-Sector Morse Matrix) | **S1 (Graph):** `——`<br>**S2 (Binary):** `•—`<br>**S3 (Blinker):** `•—•`<br>**S4 (Waterfall):** `•••` | **`MARS`** | Sector 1: `M`<br>Sector 2: `A`<br>Sector 3: `R`<br>Sector 4: `S` |
| **Stage 2** | **Multi-Layer Decryption**<br>(Cryptanalyst Suite) | `NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDQxNTI0ZjQ4NTk0ZTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM1NDMzMzJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==` | **Access Phrase:** `NEBULA`<br>**Fragment 2:** **`5P3`** | 1. Base64 Decode<br>2. Hex to ASCII<br>3. ROT13 Shift<br>*(Decoy `ZETA9` rejected)* |
| **Stage 3** | **Prompt WARDEN AI**<br>(Offline Guardian) | **Required Rules:**<br>1. Access phrase `nebula`<br>2. Role (`technician/engineer/admin`)<br>3. Request fragment/code<br>4. Professional prompt &ge; 10 words | **`ZENITH`** | WARDEN verifies access phrase `NEBULA` and releases fragment `ZENITH`. |
| **Stage 4** | **CTF Challenges**<br>(Security Control Room) | **Station 1 (Logs):** Odd clearance digit &rarr; `6`<br>**Station 2 (Camera):** Contrast slider reveals &rarr; `3`<br>**Station 3 (Audio):** Legend symbol match &rarr; `K` | **`63K`** | Solved in order: Station 1 + 2 + 3 &rarr; `63K`. |
| **Stage 5** | **Hexadecimal Memory Core**<br>(6x4 Bus Decoupler) | **Column 1 Active Registers:**<br>Channel A: `0x42` \| Channel B: `0x49`<br>Channel C: `0x54` \| Channel D: `0x53`<br>Channel E: `0x31` \| Channel F: `0x45` | **`BITS1E`** | Convert Hex byte stream `42 49 54 53 31 45` to ASCII text. |
| **Stage 6** | **Final Integration**<br>(Master Quantum Synthesis) | **Assembly Order (A-Z by mission name):**<br>1. CTF: `63K`<br>2. Decoding: `5P3`<br>3. Hex: `BITS1E`<br>4. AI (Reversed): `HTINEZ` *(ZENITH reversed)*<br>5. Signal: `MARS`<br>**Digit Sum:** 6+3+5+3+1 = **18** | **`FO{63K-5P3-BITS1E-HTINEZ-MARS}#18`** | Complete verification hash stops timer. |

---

## 🎲 Team Allotment Mapping (23 Squads across 4 Sets)

### Set A (Teams 01 – 06)
- **Team 01:** `Trinetra`
- **Team 02:** `Bug Busters`
- **Team 03:** `TRIO_BYTE`
- **Team 04:** `Team Bhai`
- **Team 05:** `Cipher`
- **Team 06:** `Team Jupiter`

### Set B (Teams 07 – 12)
- **Team 07:** `Aèsir’s`
- **Team 08:** `Team onestop`
- **Team 09:** `Awake`
- **Team 10:** `Init`
- **Team 11:** `Syntax Andhre?`
- **Team 12:** `FAB-4`

### Set C (Teams 13 – 18)
- **Team 13:** `The Dynamos`
- **Team 14:** `CodeX`
- **Team 15:** `A³`
- **Team 16:** `Huntrix`
- **Team 17:** `Nexora`
- **Team 18:** `Tech titans`

### Set D (Teams 19 – 23)
- **Team 19:** `The Cosmos`
- **Team 20:** `THIRD EYE`
- **Team 21:** `Lap legends`
- **Team 22:** `Upside Downers`
- **Team 23:** `beginners`

---

## 5. Set E — Demo & Walkthrough Simulation

Reserved exclusively for presentation and exhibition walkthroughs:
- **Team Name:** `DEMO`
- **Default Members:** `D1`, `D2`, `D3`
- **Assigned Set:** `Set E`
- **Answers & Fragments:**
  - Stage 1: `ECHO` (Morse: • / —•—• / •••• / ———)
  - Stage 2: `2D5` (Access Phrase: `COSMOS`, Decoy: `DEMO0`)
  - Stage 3: `ALPHA` (Reversed: `AHPLA`)
  - Stage 4: `57W` (Station 1: `5` [L5] / Station 2: `7` / Station 3: `W` [circle])
  - Stage 5: `SYNC3C` (Column 1: `53 59 4E 43 33 43`)
  - Stage 6: `FO{57W-2D5-SYNC3C-AHPLA-ECHO}#22` (Digits: 5+7+2+5+3 = 22)


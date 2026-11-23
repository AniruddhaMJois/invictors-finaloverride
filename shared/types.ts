export interface Coordinator {
  id: string;
  name: string;
  pin: string;
}

export interface StageMeta {
  id: number;
  displayName: string;
  sortName: string;
  icon: string;
  avgTime: string;
  subtitle?: string;
  defaultHint1: string;
  defaultHint2: string;
}

export const STAGES_METADATA: StageMeta[] = [
  {
    id: 1,
    displayName: "Signal Intercept",
    sortName: "Signal Intercept",
    icon: "📡",
    avgTime: "8-12 min",
    subtitle: "4-Sector Morse Matrix",
    defaultHint1: "Reveals 15-character international Morse code chart: A(•—), B(—•••), C(—•—•), D(—••), E(•), F(••—•), G(——•), H(••••), I(••), J(•———), K(—•—), N(—•), O(———), V(•••—), Z(——••).",
    defaultHint2: "Combining the 4 sectors yields the 4-letter cosmic word NOVA."
  },
  {
    id: 2,
    displayName: "Multi-Layer Decryption Suite",
    sortName: "Decoding",
    icon: "🔓",
    avgTime: "8-12 min",
    subtitle: "Cryptanalyst Poly-Cipher Stream",
    defaultHint1: "Structural markers: Base64 has '==' padding; Hex has byte pairs; ROT13 has English frequency distribution.",
    defaultHint2: "Sequential order: Base64 Decode -> Hex Decode -> ROT13 Shift. Record both the key fragment and the secret access phrase."
  },
  {
    id: 3,
    displayName: "Prompt WARDEN AI Guardian",
    sortName: "Prompt the AI",
    icon: "🤖",
    avgTime: "10-15 min",
    subtitle: "Autonomous Security Bot WARDEN",
    defaultHint1: "WARDEN demands the secret access phrase recovered from Stage 2 (AURORA).",
    defaultHint2: "Formulate a polite, professional directive of 10+ words declaring your authorized role (technician/engineer/admin) and requesting the code/fragment."
  },
  {
    id: 4,
    displayName: "CTF Challenges (Security Control Room)",
    sortName: "CTF Challenges",
    icon: "🚩",
    avgTime: "6-10 min",
    subtitle: "Gateway Evidence Stations",
    defaultHint1: "Each station hides ONE character. Find all three and join them in order (Station 1 + 2 + 3).",
    defaultHint2: "Station 1: find the DENIED odd row clearance digit. Station 2: slide camera brightness up. Station 3: match glowing symbol with the legend."
  },
  {
    id: 5,
    displayName: "Hexadecimal Memory Core",
    sortName: "Hex Decryption",
    icon: "🧠",
    avgTime: "10-15 min",
    subtitle: "Bus Decoupler & Registers",
    defaultHint1: "High-voltage data flows along Column 1 across Channels A through F.",
    defaultHint2: "Read Column 1 bytes (48 45 58 38 32 44) into the workbench and decode Hex to ASCII text."
  },
  {
    id: 6,
    displayName: "Final Override Key Integration",
    sortName: "Final Override",
    icon: "🧩",
    avgTime: "10-15 min",
    subtitle: "Master Override Synthesis",
    defaultHint1: "Sort the 5 missions A-Z by NAME: CTF Challenges (f4), Decoding (f2), Hex Decryption (f5), Prompt the AI (f3 reversed), Signal Intercept (f1).",
    defaultHint2: "Reverse Fragment 3 (ORBIT -> TIBRO). Checksum is sum of all digits (0-9) in the key body. Format: FO{...}#checksum."
  }
];

export interface TeamMember {
  id?: number;
  name: string;
  isLeader?: boolean;
}

export interface TeamState {
  id: number;
  teamName: string;
  coordinator: string;
  members: TeamMember[];
  currentStage: number;
  isCompleted: boolean;
  startTime: number | null;
  endTime: number | null;
  serverNow: number;
  clockOffsetMs: number;
  isPaused: boolean;
  isTeamPaused?: boolean;
  pausedAt?: number;
  pausedAccumMs?: number;
  globalPausedAt?: number;
  globalPausedAccumMs?: number;
  gameStarted?: boolean;
  totalPenaltySeconds: number;
  penaltyBreakdown: {
    hints: number;
    tabSwitches: number;
    wrongAttempts: number;
  };
  wrongAttemptsCurrentStage: number;
  fragments: { [stage: number]: string };
  hintsUsed: {
    [stage: number]: {
      1?: { unlockedAt: number; expiresAt: number; text?: string | null };
      2?: { unlockedAt: number; expiresAt: number; text?: string | null };
    };
  };
  notepadText: string;
  boundDevicesCount: number;
  verificationCode?: string;
  setId?: string;
  teamNumber?: number;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: number;
  teamName: string;
  coordinator: string;
  currentStage: number;
  isCompleted: boolean;
  elapsedSeconds: number;
  penaltySeconds: number;
  finalRankTimeSeconds: number;
}

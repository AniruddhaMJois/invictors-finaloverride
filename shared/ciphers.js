// FINAL OVERRIDE — Cryptographic Pure Function Module (ESM)

export const TARGET_PLAINTEXT = 'ACCESS PHRASE IS AURORA. FRAGMENT TWO IS 7K2. IGNORE ZETA9.';

// 1. Base64 Decode
export function base64Decode(input) {
  const clean = (input || '').replace(/\s+/g, '');
  if (!clean) return { success: false, text: input, error: 'Input is empty' };

  try {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      return { success: false, text: input, error: 'That is not valid Base64' };
    }
    const decoded = atob(clean);
    return { success: true, text: decoded };
  } catch (e) {
    return { success: false, text: input, error: 'That is not valid Base64' };
  }
}

// 2. Hex Decode
export function hexDecode(input) {
  const clean = (input || '').replace(/^0x|\s+/gi, '');
  if (!clean) return { success: false, text: input, error: 'Input is empty' };

  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    return {
      success: false,
      text: input,
      error: 'That is not valid Hex (must be even length and only 0-9, A-F)'
    };
  }

  try {
    let str = '';
    for (let i = 0; i < clean.length; i += 2) {
      str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    }
    return { success: true, text: str };
  } catch (e) {
    return { success: false, text: input, error: 'Failed to decode Hex' };
  }
}

// 3. ROT13 (letters only)
export function rot13(input) {
  const res = (input || '').replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
  return { success: true, text: res };
}

// 4. Atbash Mirror (A <-> Z, B <-> Y, digits unchanged)
export function atbashMirror(input) {
  const res = (input || '').replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + (25 - (c.charCodeAt(0) - base)));
  });
  return { success: true, text: res };
}

// 5. Reverse String
export function reverseString(input) {
  return { success: true, text: (input || '').split('').reverse().join('') };
}

// 6. ROT5 (digits only, +5 mod 10)
export function rot5(input) {
  const res = (input || '').replace(/[0-9]/g, (c) => {
    return String.fromCharCode(((c.charCodeAt(0) - 48 + 5) % 10) + 48);
  });
  return { success: true, text: res };
}

// 7. Caesar +3 (letters shifted forward by 3, preserve case)
export function caesarPlus3(input) {
  const res = (input || '').replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 3) % 26) + base);
  });
  return { success: true, text: res };
}

// 8. Vigenère Decrypt
export function vigenereDecrypt(input, key) {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, text: input, error: 'Vigenère key cannot be empty' };
  }
  if (!/^[A-Z]+$/.test(cleanKey)) {
    return {
      success: false,
      text: input,
      error: 'Vigenère key must contain only letters (A-Z)'
    };
  }

  let keyIndex = 0;
  const res = (input || '').replace(/[a-zA-Z]/g, (c) => {
    const isUpper = c <= 'Z';
    const base = isUpper ? 65 : 97;
    const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
    keyIndex++;
    return String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
  });

  return { success: true, text: res };
}

// Readability Meter: scores 0 to 100 on how English-like text is
export function calculateReadability(text) {
  if (!text || text.length < 5) return 0;

  let score = 0;
  const upper = text.toUpperCase();

  // 1. Check common target and English words (up to 60 points)
  const commonWords = [
    'ACCESS',
    'PHRASE',
    'AURORA',
    'FRAGMENT',
    'TWO',
    '7K2',
    'IGNORE',
    'ZETA9',
    'THE',
    'AND',
    'FOR',
    'ARE',
    'BUT',
    'NOT',
    'YOU',
    'ALL',
    'CAN'
  ];

  let wordsFound = 0;
  for (const w of commonWords) {
    if (upper.includes(w)) {
      wordsFound++;
    }
  }
  score += Math.min(60, wordsFound * 12);

  // 2. Printable vs unprintable ratio (up to 20 points)
  let printable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
      printable++;
    }
  }
  const printRatio = printable / text.length;
  score += Math.floor(printRatio * 20);

  // 3. Space frequency: normal English has spaces every ~4 to 7 chars (up to 20 points)
  const spaceCount = (text.match(/ /g) || []).length;
  const spaceRatio = spaceCount / text.length;
  if (spaceRatio >= 0.1 && spaceRatio <= 0.25) {
    score += 20;
  } else if (spaceRatio > 0 && spaceRatio < 0.1) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

// Forward Encoders (for server payload generation)
export function hexEncode(s) {
  let hex = '';
  for (let i = 0; i < s.length; i++) {
    hex += s.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export function base64Encode(s) {
  return btoa(s);
}

export function caesarShift(s, shift) {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + (shift % 26) + 26) % 26) + base);
  });
}

// Multi-team dynamic cipher variants
export const SET_STAGE2_VARIANTS = {
  A: {
    id: 101,
    name: 'Set A: Base64 -> Hex -> ROT13',
    payload:
      'NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDRlNDg0NTQyNDU0ZTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM3NTgzMjJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==',
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'ROT13'],
    hintClue: 'Order: Base64 Decode → Hex Decode → ROT13. Record both 7K2 and AURORA.'
  },
  B: {
    id: 102,
    name: 'Set B: Base64 -> Hex -> ROT13',
    payload:
      'NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDUwNGM0MzU1NTI0NTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM0NWEzOTJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==',
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'ROT13'],
    hintClue: 'Order: Base64 Decode → Hex Decode → ROT13. Record both 4M9 and CYPHER.'
  },
  C: {
    id: 103,
    name: 'Set C: Base64 -> Hex -> ROT13',
    payload:
      'NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDQ5NDI0NTQ3NTI0YjJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDMzNGIzODJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==',
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'ROT13'],
    hintClue: 'Order: Base64 Decode → Hex Decode → ROT13. Record both 3X8 and VORTEX.'
  },
  D: {
    id: 104,
    name: 'Set D: Base64 -> Hex -> ROT13',
    payload:
      'NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDQxNTI0ZjQ4NTk0ZTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM1NDMzMzJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==',
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'ROT13'],
    hintClue: 'Order: Base64 Decode → Hex Decode → ROT13. Record both 5P3 and NEBULA.'
  }
};

export const STAGE2_VARIANTS = [
  // Variant 0: Base64 -> Hex -> ROT13 (Official prompt default)
  {
    id: 0,
    name: 'Base64 -> Hex -> ROT13',
    payload:
      'NGU1MDUwNTI0NjQ2MjA0MzU1NDU0ZTQ2NTIyMDU2NDYyMDRlNDg0NTQyNDU0ZTJlMjA1MzQ1NGU1NDVhNTI0MTQ3MjA0NzRhNDIyMDU2NDYyMDM3NTgzMjJlMjA1NjU0NDE0MjQ1NTIyMDRkNTI0NzRlMzkyZQ==',
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'ROT13'],
    hintClue: 'Order: Base64 Decode → Hex Decode → ROT13. Record both 7K2 and AURORA.'
  },
  // Variant 1: Base64 -> Hex -> Atbash
  {
    id: 1,
    name: 'Base64 -> Hex -> Atbash',
    payload: base64Encode(hexEncode(atbashMirror(TARGET_PLAINTEXT).text)),
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'Atbash Mirror'],
    hintClue: 'Order: Base64 Decode → Hex Decode → Atbash Mirror. Record both 7K2 and AURORA.'
  },
  // Variant 2: Hex -> Base64 -> ROT13
  {
    id: 2,
    name: 'Hex -> Base64 -> ROT13',
    payload: hexEncode(base64Encode(rot13(TARGET_PLAINTEXT).text)),
    requiredSteps: ['Hex Decode', 'Base64 Decode', 'ROT13'],
    hintClue: 'Order: Hex Decode → Base64 Decode → ROT13. Record both 7K2 and AURORA.'
  },
  // Variant 3: Hex -> Base64 -> Atbash
  {
    id: 3,
    name: 'Hex -> Base64 -> Atbash',
    payload: hexEncode(base64Encode(atbashMirror(TARGET_PLAINTEXT).text)),
    requiredSteps: ['Hex Decode', 'Base64 Decode', 'Atbash Mirror'],
    hintClue: 'Order: Hex Decode → Base64 Decode → Atbash Mirror. Record both 7K2 and AURORA.'
  },
  // Variant 4: Base64 -> Hex -> Reverse
  {
    id: 4,
    name: 'Base64 -> Hex -> Reverse',
    payload: base64Encode(hexEncode(reverseString(TARGET_PLAINTEXT).text)),
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'Reverse String'],
    hintClue: 'Order: Base64 Decode → Hex Decode → Reverse String. Record both 7K2 and AURORA.'
  },
  // Variant 5: Base64 -> Hex -> Caesar +3
  {
    id: 5,
    name: 'Base64 -> Hex -> Caesar +3',
    payload: base64Encode(hexEncode(caesarShift(TARGET_PLAINTEXT, -3))),
    requiredSteps: ['Base64 Decode', 'Hex Decode', 'Caesar +3'],
    hintClue: 'Order: Base64 Decode → Hex Decode → Caesar +3. Record both 7K2 and AURORA.'
  }
];

export function getTeamVariant(teamId, setId) {
  if (setId && SET_STAGE2_VARIANTS[String(setId).toUpperCase()]) {
    return SET_STAGE2_VARIANTS[String(setId).toUpperCase()];
  }
  const index = Math.abs(Number(teamId) || 0) % STAGE2_VARIANTS.length;
  return STAGE2_VARIANTS[index];
}

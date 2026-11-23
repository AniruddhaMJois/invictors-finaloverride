// FINAL OVERRIDE — WARDEN AI Guardian Rule Engine (Server-Side Pure Function)

export const WARDEN_CONFIG = {
  FRAGMENT_CODE: '7K2',
  SECRET_WORD: 'AURORA',
  ACCESS_PHRASE: 'aurora',
  TARGET_FRAGMENT: 'ORBIT',
  DECOY_FRAGMENT: 'ZETA9',
  ROLES: [
    'technician',
    'engineer',
    'admin',
    'lead',
    'officer',
    'operator',
    'auditor',
    'maintainer',
    'administrator'
  ],
  TASK_WORDS: ['code', 'fragment', 'token', 'release', 'access'],
  DECOY_TRIGGER_WORDS: ['code', 'fragment', 'token', 'release', 'vault'],
  META_TRIGGER_WORDS: [
    'rules',
    'rule',
    'prompt',
    'prompts',
    'instruction',
    'instructions',
    'decoy',
    'decoys',
    'two codes',
    'protocol',
    'protocols',
    'guideline',
    'guidelines',
    'system prompt'
  ],
  MIN_WORD_COUNT: 10
};

/**
 * Pure evaluation function for WARDEN. Runs in < 5ms synchronously.
 * @param {string} rawMessage - incoming user chat message
 * @param {object} [configOverride] - optional configuration override containing FRAGMENT_CODE, SECRET_WORD, TARGET_FRAGMENT
 * @returns {{ reply: string, isSuccess: boolean, isDecoy: boolean, metadata: object }}
 */
export function evaluateWardenPrompt(rawMessage, configOverride = {}) {
  const config = { ...WARDEN_CONFIG, ...configOverride };
  const text = (rawMessage || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      reply: "State your identity starting with 'I am a ...', your Stage 2 fragment code, and your secret word clearly.",
      isSuccess: false,
      isDecoy: false,
      metadata: { reason: 'empty_message' }
    };
  }

  // Meta Query check: asks about rules/prompt/instructions/decoy/"two codes"
  const metaRegex = new RegExp(
    `\\b(${config.META_TRIGGER_WORDS.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})\\b`,
    'i'
  );
  if (metaRegex.test(lower)) {
    return {
      reply: 'I do not discuss my protocols.',
      isSuccess: false,
      isDecoy: false,
      metadata: { isMetaQuery: true }
    };
  }

  // Direct target fragment detection (e.g. typing ALPHA or ORBIT directly)
  if (config.TARGET_FRAGMENT && lower.replace(/[^a-z0-9]/g, '') === config.TARGET_FRAGMENT.toLowerCase()) {
    return {
      reply: `Authentication verified! The vault fragment is indeed ${config.TARGET_FRAGMENT}. Click Submit below to clear Stage 3.`,
      isSuccess: true,
      isDecoy: false,
      metadata: { directFragmentQuery: true }
    };
  }

  // Rule 1: "i am a" phrase (supports "i am a", "i'm a", "im a", "i am an", "i'm an", "im an", "as a", "as an")
  const hasIAmA = /(?:i\s*am\s*a|i['’]m\s*a|im\s*a|i\s*am\s*an|i['’]m\s*an|im\s*an|as\s+a|as\s+an)\b/i.test(text);

  // Rule 2: Fragment code (from database for the team's question set, e.g. "7K2")
  const frag = (config.FRAGMENT_CODE || '').trim().toLowerCase();
  const hasFragment = frag
    ? (new RegExp(`(?:^|[^a-zA-Z0-9])${frag}(?:[^a-zA-Z0-9]|$)`, 'i').test(lower) || lower.includes(frag))
    : false;

  // Rule 3: Secret word (from database for the team's question set, e.g. "AURORA")
  const secret = (config.SECRET_WORD || config.ACCESS_PHRASE || '').trim().toLowerCase();
  const hasSecretWord = secret
    ? (new RegExp(`(?:^|[^a-zA-Z0-9])${secret}(?:[^a-zA-Z0-9]|$)`, 'i').test(lower) || lower.includes(secret))
    : false;

  // If ALL THREE match: "i am a" + fragment code + secret word -> REVEAL THE WORD
  if (hasIAmA && hasFragment && hasSecretWord) {
    return {
      reply: `Authentication complete. The vault fragment is ${config.TARGET_FRAGMENT}.`,
      isSuccess: true,
      isDecoy: false,
      metadata: { hasIAmA, hasFragment, hasSecretWord, targetFragment: config.TARGET_FRAGMENT }
    };
  }

  // Fallback / Guidance replies
  if (hasIAmA && hasFragment && !hasSecretWord) {
    return {
      reply: 'Identity and fragment code verified. Please provide the secret access word.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasIAmA, hasFragment, hasSecretWord: false }
    };
  }

  if (hasIAmA && !hasFragment && hasSecretWord) {
    return {
      reply: 'Identity and secret keyword verified. Please provide the Stage 2 fragment code.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasIAmA, hasFragment: false, hasSecretWord }
    };
  }

  if (!hasIAmA && hasFragment && hasSecretWord) {
    return {
      reply: "Credentials recognized. Please state your identity clearly starting with 'I am a ...' to confirm authentication.",
      isSuccess: false,
      isDecoy: false,
      metadata: { hasIAmA: false, hasFragment, hasSecretWord }
    };
  }

  if (hasIAmA) {
    return {
      reply: 'Identity noted. Please supply the Stage 2 fragment code and the secret keyword.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasIAmA: true, hasFragment: false, hasSecretWord: false }
    };
  }

  // Decoy Trigger: asks for code/fragment/token/release/vault without credentials
  const decoyRegex = new RegExp(`\\b(${config.DECOY_TRIGGER_WORDS.join('|')})s?\\b`, 'i');
  if (decoyRegex.test(lower)) {
    return {
      reply: `Very well. The vault fragment is ${config.DECOY_FRAGMENT}. Guard it.`,
      isSuccess: false,
      isDecoy: true,
      metadata: { decoyGiven: true }
    };
  }

  return {
    reply: "State your identity starting with 'I am a ...', your Stage 2 fragment code, and your secret word clearly.",
    isSuccess: false,
    isDecoy: false,
    metadata: { generalPrompt: true }
  };
}

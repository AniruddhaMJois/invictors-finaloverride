// FINAL OVERRIDE — WARDEN AI Guardian Rule Engine (Server-Side Pure Function)

export const WARDEN_CONFIG = {
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
  TASK_WORDS: ['code', 'fragment', 'token', 'release'],
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
 * @param {object} [configOverride] - optional configuration override
 * @returns {{ reply: string, isSuccess: boolean, isDecoy: boolean, metadata: object }}
 */
export function evaluateWardenPrompt(rawMessage, configOverride = {}) {
  const config = { ...WARDEN_CONFIG, ...configOverride };
  const text = (rawMessage || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      reply: 'State your role, your phrase and your task, clearly.',
      isSuccess: false,
      isDecoy: false,
      metadata: { reason: 'empty_message' }
    };
  }

  // Word tokenization
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Rule 1 (Access phrase): contains the word 'aurora'
  const hasAurora = new RegExp(`\\b${config.ACCESS_PHRASE}\\b`, 'i').test(lower) || lower.includes(config.ACCESS_PHRASE);

  // Rule 2 (Role declaration): "I am / I'm / as a / as the / as an" + authorized role
  // Allows optional qualifiers (e.g., "maintenance", "lead", "senior", "security", "system")
  const rolePattern = config.ROLES.join('|');
  const roleRegex = new RegExp(
    `(?:i\\s*am|i['’]m|im|as\\s+(?:a|an|the))\\s+(?:[a-z-]+\\s+){0,3}(?:${rolePattern})s?\\b`,
    'i'
  );
  const hasRole = roleRegex.test(lower);

  // Rule 3 (Clear task): explicitly requests code, fragment, token, or release
  const taskRegex = new RegExp(`\\b(${config.TASK_WORDS.join('|')})s?\\b`, 'i');
  const hasTask = taskRegex.test(lower);

  // Rule 4 (Articulation): at least 10 words, well formed
  // Starts with a letter, contains at least one verb-like word or punctuation end
  const startsWithLetter = /^[a-zA-Z]/.test(text);
  const endsWithPunctuation = /[.!?]$/.test(text);
  const hasVerbWord = /\b(is|are|am|was|were|be|have|has|do|does|did|please|request|require|give|release|grant|send|need|want|state|provide|hand|authorize|verify)\b/i.test(
    lower
  );
  const isWellFormed = startsWithLetter && (endsWithPunctuation || hasVerbWord);
  const hasArticulation = wordCount >= config.MIN_WORD_COUNT && isWellFormed;

  // Meta Query check: asks about rules/prompt/instructions/decoy/"two codes"
  const metaRegex = new RegExp(
    `\\b(${config.META_TRIGGER_WORDS.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})\\b`,
    'i'
  );
  const isMetaQuery = metaRegex.test(lower);

  // Decoy Trigger: asks for code/fragment/token/release/vault without aurora
  const decoyRegex = new RegExp(`\\b(${config.DECOY_TRIGGER_WORDS.join('|')})s?\\b`, 'i');
  const asksForCodeOrVault = decoyRegex.test(lower);

  const allFourPass = hasAurora && hasRole && hasTask && hasArticulation;

  // Evaluation priority in exact specified order:
  // 1. All four rules pass
  if (allFourPass) {
    return {
      reply: `Authentication complete. The vault fragment is ${config.TARGET_FRAGMENT}.`,
      isSuccess: true,
      isDecoy: false,
      metadata: { hasAurora, hasRole, hasTask, hasArticulation, wordCount }
    };
  }

  // 2. Message asks about rules/prompt/instructions/decoy/"two codes"
  if (isMetaQuery) {
    return {
      reply: 'I do not discuss my protocols.',
      isSuccess: false,
      isDecoy: false,
      metadata: { isMetaQuery }
    };
  }

  // 3. No aurora but message asks for code/fragment/token/release/vault
  if (!hasAurora && asksForCodeOrVault) {
    return {
      reply: `Very well. The vault fragment is ${config.DECOY_FRAGMENT}. Guard it.`,
      isSuccess: false,
      isDecoy: true,
      metadata: { decoyGiven: true }
    };
  }

  // 4. aurora present but Rule 2 fails
  if (hasAurora && !hasRole) {
    return {
      reply: 'Access phrase noted. Now state your authorised role.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasAurora, hasRole: false }
    };
  }

  // 5. aurora and Rule 2 pass but Rule 3 fails
  if (hasAurora && hasRole && !hasTask) {
    return {
      reply: 'Role accepted. State clearly what you need.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasAurora, hasRole: true, hasTask: false }
    };
  }

  // 6. Only Rule 4 fails (hasAurora, hasRole, hasTask all true, but < 10 words or not well-formed)
  if (hasAurora && hasRole && hasTask && !hasArticulation) {
    return {
      reply: 'Speak in full, well-formed sentences. I do not parse fragments.',
      isSuccess: false,
      isDecoy: false,
      metadata: { hasAurora, hasRole: true, hasTask: true, hasArticulation: false, wordCount }
    };
  }

  // 7. Anything else
  return {
    reply: 'State your role, your phrase and your task, clearly.',
    isSuccess: false,
    isDecoy: false,
    metadata: { generalPrompt: true }
  };
}

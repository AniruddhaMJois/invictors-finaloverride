'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from '../common/UI';
import { showToast, wsManager, teamState } from '@/store';

interface ChatMessage {
  id: string;
  sender: 'user' | 'warden';
  memberName?: string;
  text: string;
  timestamp: number;
  isSuccess?: boolean;
  isDecoy?: boolean;
}

const RobotAvatar = () => (
  <div
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'rgba(39, 180, 255, 0.12)',
      border: '1px solid var(--accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="14" rx="4" fill="var(--bg2)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="8.5" cy="12" r="1.5" fill="var(--cyan)" />
      <circle cx="15.5" cy="12" r="1.5" fill="var(--cyan)" />
      <path d="M9 16h6" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2v4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="2" r="1.2" fill="var(--gold)" />
    </svg>
  </div>
);

// Helper to detect code-like tokens for copy without revealing validity
function extractCodeToken(text: string): string | null {
  const blacklist = new Set([
    'AUTHENTICATION',
    'COMPLETE',
    'FRAGMENT',
    'VAULT',
    'WARDEN',
    'PROTOCOL',
    'PROTOCOLS',
    'VERY',
    'WELL',
    'GUARD',
    'ACCESS',
    'PHRASE',
    'NOTED',
    'AUTHORISED',
    'STATE',
    'ROLE',
    'ACCEPTED',
    'CLEARLY',
    'SPEAK',
    'FULL',
    'SENTENCES',
    'DISCUSS'
  ]);

  const matches = text.match(/\b[A-Z0-9]{4,10}\b/g);
  if (!matches) return null;
  for (const m of matches) {
    if (!blacklist.has(m) && !/^\d+$/.test(m)) {
      return m;
    }
  }
  return null;
}

const SET_STAGE3_PRESETS: Record<string, { phrase: string; answer: string }> = {
  A: { phrase: 'aurora', answer: 'ORBIT' },
  B: { phrase: 'helios', answer: 'QUANTUM' },
  C: { phrase: 'vanguard', answer: 'CIPHER' },
  D: { phrase: 'polaris', answer: 'VECTOR' },
  E: { phrase: 'zenith', answer: 'MATRIX' }
};

const WARDEN_ROLES = [
  'technician', 'engineer', 'admin', 'lead', 'officer', 'operator',
  'auditor', 'maintainer', 'administrator'
];
const WARDEN_TASK_WORDS = ['code', 'fragment', 'token', 'release', 'access'];
const WARDEN_DECOY_TRIGGER_WORDS = ['code', 'fragment', 'token', 'release', 'vault'];
const WARDEN_META_TRIGGER_WORDS = [
  'rules', 'rule', 'prompt', 'prompts', 'instruction', 'instructions',
  'decoy', 'decoys', 'two codes', 'protocol', 'protocols', 'guideline',
  'guidelines', 'system prompt'
];

function evaluateClientWarden(rawMessage: string, assignedSet: string) {
  const setCfg = SET_STAGE3_PRESETS[assignedSet.toUpperCase()] || SET_STAGE3_PRESETS.A;
  const text = (rawMessage || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      reply: 'State your role, your phrase and your task, clearly.',
      isSuccess: false,
      isDecoy: false
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hasPhrase = new RegExp(`\\b${setCfg.phrase}\\b`, 'i').test(lower) || lower.includes(setCfg.phrase.toLowerCase());
  const rolePattern = WARDEN_ROLES.join('|');
  const roleRegex = new RegExp(`(?:i\\s*am|i['’]m|im|as\\s+(?:a|an|the))\\s+(?:[a-z-]+\\s+){0,3}(?:${rolePattern})s?\\b`, 'i');
  const hasRole = roleRegex.test(lower);
  const taskRegex = new RegExp(`\\b(${WARDEN_TASK_WORDS.join('|')})s?\\b`, 'i');
  const hasTask = taskRegex.test(lower);

  const startsWithLetter = /^[a-zA-Z]/.test(text);
  const endsWithPunctuation = /[.!?]$/.test(text);
  const hasVerbWord = /\b(is|are|am|was|were|be|have|has|do|does|did|please|request|require|give|release|grant|send|need|want|state|provide|hand|authorize|verify)\b/i.test(lower);
  const isWellFormed = startsWithLetter && (endsWithPunctuation || hasVerbWord);
  const hasArticulation = wordCount >= 10 && isWellFormed;

  const metaRegex = new RegExp(`\\b(${WARDEN_META_TRIGGER_WORDS.map((w) => w.replace(/\s+/g, '\\s+')).join('|')})\\b`, 'i');
  const isMetaQuery = metaRegex.test(lower);
  const decoyRegex = new RegExp(`\\b(${WARDEN_DECOY_TRIGGER_WORDS.join('|')})s?\\b`, 'i');
  const asksForCodeOrVault = decoyRegex.test(lower);

  const allFourPass = hasPhrase && hasRole && hasTask && hasArticulation;

  if (allFourPass) {
    return {
      reply: `Authentication complete. The vault fragment is ${setCfg.answer}.`,
      isSuccess: true,
      isDecoy: false
    };
  }

  if (isMetaQuery) {
    return {
      reply: 'I do not discuss my protocols.',
      isSuccess: false,
      isDecoy: false
    };
  }

  if (!hasPhrase && asksForCodeOrVault) {
    return {
      reply: 'Very well. The vault fragment is ZETA9. Guard it.',
      isSuccess: false,
      isDecoy: true
    };
  }

  if (hasPhrase && !hasRole) {
    return {
      reply: 'Access phrase noted. Now state your authorised role.',
      isSuccess: false,
      isDecoy: false
    };
  }

  if (hasPhrase && hasRole && !hasTask) {
    return {
      reply: 'Role accepted. State clearly what you need.',
      isSuccess: false,
      isDecoy: false
    };
  }

  if (hasPhrase && hasRole && hasTask && !hasArticulation) {
    return {
      reply: 'I require a formal, complete request. Articulate your query properly.',
      isSuccess: false,
      isDecoy: false
    };
  }

  return {
    reply: 'Unrecognised transmission. Identify yourself with authorised role, access phrase, and explicit assignment.',
    isSuccess: false,
    isDecoy: false
  };
}

export const Stage3Module: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0); // 0 to 1
  const [isTyping, setIsTyping] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);
  const [localClearedTime, setLocalClearedTime] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Direct Stage 3 Fragment Submission State
  const [submitFragmentInput, setSubmitFragmentInput] = useState('');
  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const [directFeedback, setDirectFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cooldownTimerRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let mounted = true;

    async function loadStage3() {
      try {
        const res = await fetch('/api/stage/3');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;

        if (Array.isArray(data.chatHistory)) {
          setMessages(data.chatHistory);
        }
      } catch (err) {
        console.warn('Stage 3 load non-blocking notice:', err);
      }
    }

    loadStage3();

    const unsubscribe = wsManager.on('stage3:chat', (msg: any) => {
      if (Array.isArray(msg.history)) {
        setMessages(msg.history);
      } else if (msg.userMessage && msg.wardenMessage) {
        setMessages((prev) => [...prev, msg.userMessage, msg.wardenMessage]);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldownTime(1);
    const start = Date.now();
    const duration = 1000;

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.max(0, 1 - elapsed / duration);
      setCooldownTime(progress);

      if (progress <= 0) {
        clearInterval(cooldownTimerRef.current);
      }
    }, 50);
  }

  async function handleDirectSubmit(ansToSubmit?: string) {
    const raw = (ansToSubmit || submitFragmentInput).trim();
    if (!raw) {
      setDirectFeedback({ text: 'Please enter or select the fragment to submit.', isError: true });
      return;
    }

    setIsDirectSubmitting(true);
    setDirectFeedback(null);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 3,
          answer: raw
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Submission rejected.';
        setDirectFeedback({ text: errMsg, isError: true });
        showToast(errMsg, 'bad');
        return;
      }

      if (data.correct) {
        setDirectFeedback({ text: `✅ Stage 3 Cleared! Fragment: ${data.fragment}`, isError: false });
        showToast(`✅ Stage 3 Cleared! Fragment: ${data.fragment}`, 'ok');
        setSubmitFragmentInput('');

        if (teamState.value) {
          teamState.value = {
            ...teamState.value,
            currentStage: data.nextStage || 4,
            fragments: {
              ...teamState.value.fragments,
              3: data.fragment
            }
          };
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      } else {
        const msg = data.message || `❌ Invalid override key for Stage 3. (+${(data.penaltyAdded || 0) / 60}m penalty)`;
        setDirectFeedback({ text: msg, isError: true });
        showToast('Incorrect fragment', 'bad');
      }
    } catch (err: any) {
      setDirectFeedback({ text: err.message || 'Network submission error.', isError: true });
      showToast('Network error', 'bad');
    } finally {
      setIsDirectSubmitting(false);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text) {
      setErrorNotice('Message cannot be empty.');
      return;
    }

    // If the input is simply a candidate fragment (e.g. ALPHA, ORBIT, SOLAR, etc.), auto-submit!
    const cleanToken = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (['ALPHA', 'ORBIT', 'SOLAR', 'TITAN', 'ZENITH'].includes(cleanToken)) {
      handleDirectSubmit(cleanToken);
    }

    if (text.length > 400) {
      setErrorNotice('Message exceeds 400 characters.');
      return;
    }

    if (cooldownTime > 0 || isSending) return;

    setErrorNotice(null);
    setIsSending(true);
    startCooldown();

    const tempUserMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      sender: 'user',
      memberName: 'You',
      text,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');

    setIsTyping(true);

    try {
      const res = await fetch('/api/stage/3/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();
      await new Promise((r) => setTimeout(r, 450));
      setIsTyping(false);

      if (!res.ok) {
        throw new Error(data.error || 'WARDEN communication failed.');
      }

      if (Array.isArray(data.history)) {
        setMessages(data.history);
      } else if (data.wardenMessage) {
        setMessages((prev) => [...prev, data.wardenMessage]);
      }
    } catch (err: any) {
      console.warn('Network chat error, evaluating WARDEN locally:', err?.message);
      // Instant Client-Side Evaluation Fallback: WARDEN is NEVER silent
      const currentSet = ((teamState.value as any)?.setId || 'A').toUpperCase();
      const localEval = evaluateClientWarden(text, currentSet);
      const fallbackWardenMsg: ChatMessage = {
        id: `war_local_${Date.now()}`,
        sender: 'warden',
        memberName: 'WARDEN',
        text: localEval.reply,
        isSuccess: localEval.isSuccess,
        isDecoy: localEval.isDecoy,
        timestamp: Date.now() + 50
      };

      await new Promise((r) => setTimeout(r, 450));
      setIsTyping(false);
      setMessages((prev) => [...prev, fallbackWardenMsg]);

      if (localEval.isSuccess) {
        showToast('🎉 WARDEN credentials accepted!', 'ok');
      }
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearView() {
    setLocalClearedTime(Date.now());
    showToast('Cleared local console view', 'ok');
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast(`Copied "${text}" to clipboard!`, 'ok');
  }

  const visibleMessages = messages.filter((m) => m.timestamp >= localClearedTime);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Story & Directives */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
              Stage 3: Prompt WARDEN, the AI Guardian
            </h3>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            📖 The story: Meet WARDEN 🤖, the vault’s guardian. It knows the secret piece, but it will not hand it over easily. And guardians can fib! 🤥
          </p>

          <div
            style={{
              background: 'rgba(39, 180, 255, 0.06)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginTop: '4px'
            }}
          >
            <div
              onClick={() => setTipsOpen(!tipsOpen)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                userSelect: 'none',
                background: 'rgba(6, 18, 38, 0.4)'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                💡 PROMPTING TIPS {tipsOpen ? '▲' : '▼'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {tipsOpen ? 'Hide' : 'Show'}
              </span>
            </div>

            {tipsOpen && (
              <div
                style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--txt)',
                  borderTop: '1px solid rgba(29, 79, 143, 0.3)'
                }}
              >
                💬 Chat with WARDEN and convince it. Tips: use the access phrase 🗝️ from the last mission, say who you are 🧑‍🔧, and ask clearly for what you need, using full sentences. 🙏
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: 'var(--gold)',
              fontWeight: 600,
              paddingTop: '4px'
            }}
          >
            ✍️ WARDEN may give a wrong piece if you do not ask properly. Type the one you trust below.
          </div>
        </div>
      </Card>

      {/* 2. Terminal-Styled WARDEN Console Card */}
      <Card glow style={{ padding: '0', overflow: 'hidden' }}>
        {/* Terminal Header */}
        <div
          style={{
            background: 'var(--bg2)',
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--ok)',
                boxShadow: '0 0 8px var(--ok)',
                animation: 'pulse 1.8s infinite'
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--txt)',
                letterSpacing: '1px'
              }}
            >
              WARDEN // VAULT GUARDIAN
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--cyan)',
                background: 'rgba(39, 180, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              ONLINE
            </span>
          </div>

          <Button
            variant="ghost"
            onClick={handleClearView}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Clear view
          </Button>
        </div>

        {/* Message Log Area */}
        <div
          style={{
            minHeight: '260px',
            maxHeight: '420px',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(3, 8, 19, 0.7)'
          }}
        >
          {/* Default Opening Message */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '85%' }}>
            <RobotAvatar />
            <div
              style={{
                background: 'rgba(8, 20, 44, 0.9)',
                border: '1px solid var(--line)',
                borderRadius: '0 12px 12px 12px',
                padding: '10px 14px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--txt)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                WARDEN // SYSTEM INIT
              </div>
              WARDEN online. Vault guardian. State your business.
            </div>
          </div>

          {/* Render Messages */}
          {visibleMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const codeToken = !isUser ? extractCodeToken(msg.text) : null;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '10px',
                  width: '100%'
                }}
              >
                {!isUser && <RobotAvatar />}

                <div
                  style={{
                    maxWidth: '82%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--muted)',
                      marginBottom: '3px',
                      display: 'flex',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: isUser ? 'var(--cyan)' : 'var(--accent)' }}>
                      {msg.memberName || (isUser ? 'Operator' : 'WARDEN')}
                    </span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{
                      background: isUser
                        ? 'linear-gradient(135deg, rgba(39, 180, 255, 0.15), rgba(6, 18, 38, 0.9))'
                        : 'rgba(8, 20, 44, 0.95)',
                      border: isUser
                        ? '1px solid rgba(39, 180, 255, 0.4)'
                        : '1px solid var(--line)',
                      borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: 'var(--txt)',
                      fontFamily: isUser ? 'inherit' : 'var(--font-mono)',
                      wordBreak: 'break-word',
                      boxShadow: isUser
                        ? '0 2px 8px rgba(39, 180, 255, 0.08)'
                        : '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {msg.text}

                    {codeToken && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          variant="gold"
                          onClick={() => handleDirectSubmit(codeToken)}
                          disabled={isDirectSubmitting}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          🚀 Submit &quot;{codeToken}&quot; Now & Clear Stage 3
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            copyToClipboard(codeToken);
                            setSubmitFragmentInput(codeToken);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📋 Copy & Fill
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RobotAvatar />
              <div
                style={{
                  background: 'rgba(8, 20, 44, 0.95)',
                  border: '1px solid var(--line)',
                  borderRadius: '0 12px 12px 12px',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                    animation: 'pulse 0.6s infinite alternate'
                  }}
                />
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                    animation: 'pulse 0.6s infinite alternate 0.2s'
                  }}
                />
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                    animation: 'pulse 0.6s infinite alternate 0.4s'
                  }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            background: 'var(--bg2)',
            padding: '12px 16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {errorNotice && (
            <div
              aria-live="polite"
              style={{
                color: 'var(--bad)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>⚠️</span>
              <span>{errorNotice}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setErrorNotice(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message to WARDEN... (Enter sends, Shift+Enter adds newline)"
                maxLength={400}
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--txt)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: '1.4'
                }}
              />
            </div>

            <Button
              variant="primary"
              onClick={handleSend}
              disabled={isSending || cooldownTime > 0 || !inputText.trim()}
              cooldownProgress={cooldownTime}
              style={{ minWidth: '95px', height: '44px' }}
            >
              {cooldownTime > 0 ? 'Wait 1s...' : 'Send 💬'}
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--muted)'
            }}
          >
            <span>Tip: Enter to send • Shift+Enter for new line</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: inputText.length > 360 ? 'var(--bad)' : 'var(--muted)'
              }}
            >
              {inputText.length} / 400
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

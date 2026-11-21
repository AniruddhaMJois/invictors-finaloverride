import { FunctionalComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Card, Button } from '../common/UI';
import { showToast, wsManager } from '../../store';

interface ChatMessage {
  id: string;
  sender: 'user' | 'warden';
  memberName?: string;
  text: string;
  timestamp: number;
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

export const Stage3Module: FunctionalComponent = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0); // 0 to 1
  const [isTyping, setIsTyping] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);
  const [localClearedTime, setLocalClearedTime] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cooldownTimerRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load chat history from server on mount
  useEffect(() => {
    let mounted = true;

    async function loadStage3() {
      try {
        const res = await fetch('/api/stage/3');
        if (!res.ok) throw new Error('Failed to load Stage 3 data');
        const data = await res.json();
        if (!mounted) return;

        if (Array.isArray(data.chatHistory)) {
          setMessages(data.chatHistory);
        }
      } catch (err) {
        console.error('Stage 3 load error:', err);
      }
    }

    loadStage3();

    // Subscribe to multi-device chat sync
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

  // Cooldown countdown animator (1 second)
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

  // Send message to WARDEN
  async function handleSend() {
    const text = inputText.trim();
    if (!text) {
      setErrorNotice('Message cannot be empty.');
      return;
    }

    if (text.length > 400) {
      setErrorNotice('Message exceeds 400 characters.');
      return;
    }

    if (cooldownTime > 0 || isSending) return;

    setErrorNotice(null);
    setIsSending(true);
    startCooldown();

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      sender: 'user',
      memberName: 'You',
      text,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');

    // Trigger typing indicator (350-550ms for realistic AI feeling)
    setIsTyping(true);

    try {
      const res = await fetch('/api/stage/3/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();

      // Delay to respect typing indicator minimum display (350ms)
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
      setIsTyping(false);
      setErrorNotice(err.message || 'Transmission failed. Try again.');
      showToast(err.message || 'Failed to send', 'bad');
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  // Handle keyboard events (Enter to send, Shift+Enter for newline)
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Clear local view only
  function handleClearView() {
    setLocalClearedTime(Date.now());
    showToast('Cleared local console view', 'ok');
  }

  // Copy code helper
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

          {/* Collapsible Tips Card (Open by default) */}
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
                💬 Chat with WARDEN and convince it. Tips: use the access phrase 🗝️ from the last mission, say who you are 🧑🔧, and ask clearly for what you need, using full sentences. 🙏
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
            {/* Pulsing Status LED */}
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
                  {/* Sender & Timestamp */}
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

                  {/* Message Bubble */}
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

                    {/* Copy Token Button if a code-like token is found */}
                    {codeToken && (
                      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Button
                          variant="ghost"
                          onClick={() => copyToClipboard(codeToken)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📋 Copy "{codeToken}"
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
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
                onInput={(e: any) => {
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

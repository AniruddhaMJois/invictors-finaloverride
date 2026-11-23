import { FunctionalComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Card, Button, Input, Modal } from '../common/UI';
import { showToast, wsManager, useSignal, teamState } from '../../store';
import {
  base64Decode,
  hexDecode,
  rot13,
  atbashMirror,
  reverseString,
  rot5,
  caesarPlus3,
  vigenereDecrypt,
  calculateReadability,
  CipherResult,
  SET_STAGE2_VARIANTS
} from '../../../../shared/ciphers';

interface HistoryStep {
  tool: string;
  beforePreview: string;
  afterPreview: string;
  previousText: string;
}

const TOOL_ICONS: Record<string, string> = {
  'Base64 Decode': '📦',
  'Hex Decode': '🔢',
  'ROT13': '🔄',
  'Atbash Mirror': '🪞',
  'Reverse String': '◀️',
  'ROT5': '5️⃣',
  'Caesar +3': '🏛️',
  'Vigenère': '🔑'
};

const DEFAULT_TOOLS = [
  'Base64 Decode',
  'Hex Decode',
  'ROT13',
  'Atbash Mirror',
  'Reverse String',
  'ROT5',
  'Caesar +3',
  'Vigenère'
];

export const Stage2Module: FunctionalComponent = () => {
  const state = useSignal(teamState);
  const [initialPayload, setInitialPayload] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeToolPulse, setActiveToolPulse] = useState<string | null>(null);
  const [toolsList, setToolsList] = useState<string[]>([]);

  // Vigenère Modal state
  const [vigenereModalOpen, setVigenereModalOpen] = useState(false);
  const [vigenereKey, setVigenereKey] = useState('');
  const [vigenereError, setVigenereError] = useState<string | null>(null);

  // Reset Confirmation Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // In-Module Stage 2 Direct Submission State
  const [stage2Input, setStage2Input] = useState('');
  const [isSubmittingStage2, setIsSubmittingStage2] = useState(false);
  const [stage2Feedback, setStage2Feedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isEditingBuffer, setIsEditingBuffer] = useState(false);
  const [editBufferText, setEditBufferText] = useState('');

  // Typewriter animation ref
  const animFrameRef = useRef<any>(null);
  const syncTimeoutRef = useRef<any>(null);
  const isLocalUpdateRef = useRef(false);

  // Fetch initial stage data
  useEffect(() => {
    let mounted = true;

    async function loadStage2() {
      try {
        const res = await fetch('/api/stage/2');
        let data: any = null;
        if (res.ok) {
          data = await res.json();
        } else {
          console.warn('Stage 2 API returned non-OK status', res.status, '— using local set payload');
          const fallbackSet = (((state as any)?.setId || 'A') as string).toUpperCase();
          const fallbackVariant = SET_STAGE2_VARIANTS[fallbackSet] || SET_STAGE2_VARIANTS.A;
          data = {
            payload: fallbackVariant.payload,
            tools: DEFAULT_TOOLS,
            workbench: { currentText: fallbackVariant.payload, history: [] }
          };
        }
        if (!mounted || !data) return;

        setInitialPayload(data.payload || '');
        if (Array.isArray(data.tools) && data.tools.length > 0) {
          setToolsList(data.tools);
        }

        const savedWorkbench = data.workbench;
        const textToSet = (savedWorkbench && savedWorkbench.currentText) || data.payload || '';
        setCurrentText(textToSet);
        setDisplayedText(textToSet);

        if (savedWorkbench && Array.isArray(savedWorkbench.history)) {
          setHistory(savedWorkbench.history);
        }
      } catch (err: any) {
        console.warn('Stage 2 load network exception, applying local set payload:', err?.message);
        const fallbackSet = (((state as any)?.setId || 'A') as string).toUpperCase();
        const fallbackVariant = SET_STAGE2_VARIANTS[fallbackSet] || SET_STAGE2_VARIANTS.A;
        if (mounted) {
          setInitialPayload(fallbackVariant.payload);
          setCurrentText(fallbackVariant.payload);
          setDisplayedText(fallbackVariant.payload);
          setToolsList(DEFAULT_TOOLS);
        }
      }
    }

    loadStage2();

    // Listen to WebSocket broadcasts for multi-device sync
    const unsubscribe = wsManager.on('stage2:workbench', (msg: any) => {
      if (msg.workbench && !isLocalUpdateRef.current) {
        const wb = msg.workbench;
        setCurrentText(wb.currentText || '');
        setDisplayedText(wb.currentText || '');
        if (Array.isArray(wb.history)) {
          setHistory(wb.history);
        }
        setErrorMsg(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Debounced server sync
  function syncWorkbench(text: string, hist: HistoryStep[]) {
    isLocalUpdateRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/stage/2/workbench', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentText: text, history: hist })
        });
      } catch (e) {
        console.error('Failed to sync workbench state:', e);
      } finally {
        setTimeout(() => {
          isLocalUpdateRef.current = false;
        }, 100);
      }
    }, 400);
  }

  // Typewriter reveal effect (max 250ms, skipped on reduced motion)
  function revealText(targetText: string) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || targetText.length <= 15) {
      setDisplayedText(targetText);
      return;
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const startTime = performance.now();
    const duration = Math.min(250, Math.max(80, targetText.length * 1.5));

    function frame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const charsToShow = Math.floor(progress * targetText.length);
      setDisplayedText(targetText.slice(0, charsToShow));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        setDisplayedText(targetText);
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
  }

  // Execute a tool transformation
  function applyTool(toolName: string, param?: string) {
    // Pulse animation
    setActiveToolPulse(toolName);
    setTimeout(() => setActiveToolPulse(null), 300);

    setErrorMsg(null);
    let result: CipherResult = { success: false, text: currentText, error: '' };

    switch (toolName) {
      case 'Base64 Decode':
        result = base64Decode(currentText);
        break;
      case 'Hex Decode':
        result = hexDecode(currentText);
        break;
      case 'ROT13':
        result = rot13(currentText);
        break;
      case 'Atbash Mirror':
        result = atbashMirror(currentText);
        break;
      case 'Reverse String':
        result = reverseString(currentText);
        break;
      case 'ROT5':
        result = rot5(currentText);
        break;
      case 'Caesar +3':
        result = caesarPlus3(currentText);
        break;
      case 'Vigenère':
        result = vigenereDecrypt(currentText, param || '');
        break;
      default:
        result = { success: false, text: currentText, error: 'Unknown tool' };
    }

    if (!result.success) {
      setErrorMsg(result.error || 'Transformation failed.');
      return;
    }

    const prev = currentText;
    const next = result.text;

    const step: HistoryStep = {
      tool: toolName + (param ? ` (${param})` : ''),
      beforePreview: prev.slice(0, 40).replace(/\n/g, ' '),
      afterPreview: next.slice(0, 40).replace(/\n/g, ' '),
      previousText: prev
    };

    const newHistory = [step, ...history].slice(0, 50);
    setCurrentText(next);
    revealText(next);
    setHistory(newHistory);
    syncWorkbench(next, newHistory);
  }

  // Undo last step
  function handleUndo() {
    if (history.length === 0) return;
    const [lastStep, ...remaining] = history;
    setCurrentText(lastStep.previousText);
    revealText(lastStep.previousText);
    setHistory(remaining);
    setErrorMsg(null);
    syncWorkbench(lastStep.previousText, remaining);
    showToast(`Reverted: ${lastStep.tool}`, 'ok');
  }

  // Jump to specific step in history
  function handleJumpTo(index: number) {
    const targetStep = history[index];
    const targetText = targetStep.previousText;
    const remaining = history.slice(index + 1);

    setCurrentText(targetText);
    revealText(targetText);
    setHistory(remaining);
    setErrorMsg(null);
    syncWorkbench(targetText, remaining);
    showToast(`Jumped back to step ${history.length - index}`, 'ok');
  }

  // Reset to original payload
  function handleReset() {
    setResetModalOpen(false);
    setCurrentText(initialPayload);
    revealText(initialPayload);
    setHistory([]);
    setErrorMsg(null);
    syncWorkbench(initialPayload, []);
    showToast('Workbench reset to original payload', 'ok');
  }

  // Copy helper
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'ok');
  }

  // Calculate readability score
  const readabilityScore = calculateReadability(currentText);

  const getMeterColor = () => {
    if (readabilityScore >= 80) return 'var(--ok)';
    if (readabilityScore >= 40) return 'var(--gold)';
    return 'var(--line)';
  };

  // Dynamically extract fragment and access phrase from current text
  const fragmentMatch = currentText.match(/FRAGMENT\s+(?:TWO|2)\s+IS\s+([A-Z0-9]+)/i);
  const phraseMatch = currentText.match(/ACCESS\s+PHRASE\s+IS\s+([A-Z0-9]+)/i);
  const detectedFragment = fragmentMatch ? fragmentMatch[1].toUpperCase() : null;
  const detectedPhrase = phraseMatch ? phraseMatch[1].toUpperCase() : null;

  async function handleStage2Submit(e?: any, customAns?: string) {
    if (e && e.preventDefault) e.preventDefault();
    const ans = (customAns || stage2Input).trim();
    if (!ans || isSubmittingStage2) return;

    setIsSubmittingStage2(true);
    setStage2Feedback(null);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 2,
          answer: ans
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStage2Feedback({ text: data.error || 'Submission rejected.', isError: true });
        return;
      }

      if (data.correct) {
        setStage2Feedback({
          text: `✅ Mission 2 cleared! Moving to Stage ${data.nextStage || 3}...`,
          isError: false
        });
        showToast(`🎉 Mission 2 cleared! Fragment: ${data.fragment || ans}`, 'ok');
        setStage2Input('');

        if (data.nextStage) {
          teamState.value = {
            ...state,
            currentStage: data.nextStage,
            isCompleted: Boolean(data.isCompleted),
            verificationCode: data.verificationCode || (state as any)?.verificationCode,
            fragments: {
              ...((state as any)?.fragments || {}),
              2: data.fragment || ans
            }
          };
          window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: '' }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        setStage2Feedback({
          text: data.message || `Not quite, try again 🙂 (Attempts: ${data.attempts || 1})`,
          isError: true
        });
      }
    } catch (err: any) {
      setStage2Feedback({ text: err.message || 'Submission error.', isError: true });
    } finally {
      setIsSubmittingStage2(false);
    }
  }

  function handleAutoFill(fragment: string) {
    setStage2Input(fragment);
    window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: fragment }));
    showToast(`Filled "${fragment}" into solution bar!`, 'ok');
  }

  function handleApplyBuffer() {
    setIsEditingBuffer(false);
    const next = editBufferText;
    const prev = currentText;
    const step: HistoryStep = {
      tool: 'Custom Edit',
      beforePreview: prev.slice(0, 40).replace(/\n/g, ' '),
      afterPreview: next.slice(0, 40).replace(/\n/g, ' '),
      previousText: prev
    };
    const newHistory = [step, ...history].slice(0, 50);
    setCurrentText(next);
    revealText(next);
    setHistory(newHistory);
    syncWorkbench(next, newHistory);
    showToast('Applied custom text to workbench', 'ok');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Story & Mission Directives */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔓</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)' }}>
              Stage 2: Multi-Layer Decryption Suite
            </h3>
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            📖 The story: The vault sent a second message, but it is wrapped in 3 scrambled layers, like a gift with 3 wrappers. 🎁 Unwrap one layer at a time, in the right order, to read the secret message.
          </p>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--cyan)',
              background: 'rgba(39, 180, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '8px',
              borderLeft: '3px solid var(--accent)'
            }}
          >
            ✍️ The message tells you the secret piece. Type it below. 👉 Also remember the special access phrase in it: you will need it in the next mission! 🗝️
          </div>
        </div>
      </Card>

      {/* 2. Intercepted Transmission Payload Box */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📦</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px' }}>
              INTERCEPTED RAW PAYLOAD ({initialPayload.length} CHARS)
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={() => copyToClipboard(initialPayload, 'Raw Payload')}
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            📋 Copy Payload
          </Button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            background: 'var(--bg)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            color: 'var(--txt)',
            wordBreak: 'break-all',
            lineHeight: '1.5',
            maxHeight: '80px',
            overflowY: 'auto',
            userSelect: 'all'
          }}
        >
          {initialPayload || 'Loading transmission payload...'}
        </div>
      </Card>

      {/* 3. Workbench Panel */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛠️</span>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gold)', margin: 0 }}>
                Cryptanalyst Workbench
              </h4>
              <span className="badge badge-blue">{currentText.length} chars</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant={isEditingBuffer ? 'gold' : 'ghost'}
                onClick={() => {
                  if (isEditingBuffer) {
                    handleApplyBuffer();
                  } else {
                    setEditBufferText(currentText);
                    setIsEditingBuffer(true);
                  }
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {isEditingBuffer ? '💾 Apply Edit' : '✏️ Edit / Paste'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(currentText, 'Workbench Buffer')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                📋 Copy Text
              </Button>
              <Button
                variant="ghost"
                onClick={handleUndo}
                disabled={history.length === 0}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                ↩️ Undo
              </Button>
              <Button
                variant="danger"
                onClick={() => setResetModalOpen(true)}
                disabled={currentText === initialPayload && history.length === 0}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                🔄 Reset
              </Button>
            </div>
          </div>

          {/* Readability Meter */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '6px'
              }}
            >
              <span style={{ color: 'var(--muted)' }}>READABILITY / DECRYPTION CONFIDENCE</span>
              <span style={{ color: getMeterColor(), fontFamily: 'var(--font-mono)' }}>
                {readabilityScore}% {readabilityScore >= 80 ? '✓ PLAINTEXT DETECTED' : ''}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'var(--bg)',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--line)'
              }}
            >
              <div
                style={{
                  width: `${readabilityScore}%`,
                  height: '100%',
                  background: getMeterColor(),
                  transition: 'width 0.3s ease, background 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Team Notepad Nudge (Triggered at >= 80% Readability) */}
          {readabilityScore >= 80 && (
            <div
              style={{
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid var(--ok)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                animation: 'pulse 2s infinite'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                  Tip: write the access phrase in your Team Notepad. You will need it in Mission 3.
                </span>
              </div>
              <Button
                variant="gold"
                onClick={() => copyToClipboard(detectedPhrase || 'AURORA', 'Access Phrase')}
                style={{ padding: '4px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
              >
                Copy &quot;{detectedPhrase || 'AURORA'}&quot;
              </Button>
            </div>
          )}

          {/* Current Buffer Monospace Area / Editable Buffer */}
          <div style={{ position: 'relative' }}>
            {isEditingBuffer ? (
              <textarea
                value={editBufferText}
                onChange={(e: any) => setEditBufferText(e.target.value)}
                placeholder="Paste or type payload/ciphertext directly here..."
                rows={5}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  background: 'var(--bg)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--accent)',
                  color: 'var(--txt)',
                  wordBreak: 'break-all',
                  minHeight: '110px',
                  maxHeight: '260px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  background: 'var(--bg)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: errorMsg ? '1px solid var(--bad)' : '1px solid var(--line)',
                  color: readabilityScore >= 80 ? 'var(--cyan)' : 'var(--txt)',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  minHeight: '110px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  lineHeight: '1.6',
                  userSelect: 'text'
                }}
              >
                {displayedText || '(empty buffer)'}
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div
                aria-live="polite"
                style={{
                  marginTop: '8px',
                  background: 'rgba(255, 93, 108, 0.15)',
                  border: '1px solid var(--bad)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--bad)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* 8-Tools Grid */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '0.5px',
                marginBottom: '10px'
              }}
            >
              CRYPTOGRAPHIC TOOLS (APPLY IN ORDER)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px'
              }}
            >
              {(toolsList.length > 0 ? toolsList : DEFAULT_TOOLS).map((toolName) => {
                const icon = TOOL_ICONS[toolName] || '⚙️';
                const isPulsing = activeToolPulse === toolName;
                return (
                  <Button
                    key={toolName}
                    variant="primary"
                    onClick={() => {
                      if (toolName === 'Vigenère') {
                        setVigenereKey('');
                        setVigenereError(null);
                        setVigenereModalOpen(true);
                      } else {
                        applyTool(toolName);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      transform: isPulsing ? 'scale(0.96)' : 'scale(1)',
                      boxShadow: isPulsing ? '0 0 12px var(--accent)' : 'none',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    <span>{icon}</span>
                    <span>{toolName}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Direct Stage 2 Key Submission Card inside the Module */}
          <div
            style={{
              background: 'rgba(5, 14, 30, 0.95)',
              border: '2px solid var(--gold)',
              borderRadius: '10px',
              padding: '16px 20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔑</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: 'var(--gold)'
                  }}
                >
                  STAGE 2 OVERRIDE KEY SUBMISSION
                </span>
              </div>
              {detectedFragment && (
                <Button
                  variant="gold"
                  onClick={() => handleStage2Submit(undefined, detectedFragment)}
                  disabled={isSubmittingStage2}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  ⚡ One-Click Submit &quot;{detectedFragment}&quot;
                </Button>
              )}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px 0' }}>
              Decrypted payload reveals: &quot;FRAGMENT TWO IS [KEY]&quot;. Enter the 3-character fragment below to unlock Mission 3. (Note: &quot;{detectedPhrase || 'AURORA'}&quot; is the Mission 3 access phrase).
            </p>

            <form
              onSubmit={(e: any) => handleStage2Submit(e)}
              style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
            >
              <Input
                value={stage2Input}
                onChange={(e: any) => {
                  setStage2Input(e.target.value);
                  if (stage2Feedback) setStage2Feedback(null);
                }}
                placeholder="Enter Stage 2 fragment (e.g. 7K2)"
                style={{ flex: 1 }}
              />
              {detectedFragment && stage2Input !== detectedFragment && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleAutoFill(detectedFragment)}
                  style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '8px 12px' }}
                >
                  Auto-fill {detectedFragment}
                </Button>
              )}
              <Button
                type="submit"
                variant="gold"
                disabled={isSubmittingStage2 || !stage2Input.trim()}
                style={{ minWidth: '130px' }}
              >
                {isSubmittingStage2 ? 'Checking...' : 'Submit Key ✅'}
              </Button>
            </form>

            {stage2Feedback && (
              <div
                aria-live="polite"
                style={{
                  marginTop: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: stage2Feedback.isError ? 'var(--bad)' : 'var(--ok)'
                }}
              >
                {stage2Feedback.text}
              </div>
            )}
          </div>

          {/* History Stack */}
          {history.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                  OPERATION HISTORY ({history.length} STEPS)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>Tap a step to jump back</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}
              >
                {history.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleJumpTo(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(6, 18, 38, 0.7)',
                      borderRadius: '6px',
                      border: '1px solid rgba(29, 79, 143, 0.4)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={(e: any) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e: any) =>
                      (e.currentTarget.style.borderColor = 'rgba(29, 79, 143, 0.4)')
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          color: 'var(--gold)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        #{history.length - idx}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--txt)' }}>{step.tool}</span>
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--muted)',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {step.beforePreview} → {step.afterPreview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Vigenère Decryption Key Modal */}
      <Modal
        isOpen={vigenereModalOpen}
        onClose={() => setVigenereModalOpen(false)}
        title="🔑 Vigenère Cipher Decryption"
        confirmText="Decrypt"
        onConfirm={() => {
          const cleanKey = vigenereKey.trim().toUpperCase();
          if (!cleanKey) {
            setVigenereError('Vigenère key cannot be empty');
            return;
          }
          if (!/^[A-Z]+$/.test(cleanKey)) {
            setVigenereError('Key must contain only letters (A-Z)');
            return;
          }
          setVigenereModalOpen(false);
          applyTool('Vigenère', cleanKey);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Enter the polyalphabetic key phrase to decrypt the current text:
          </p>
          <Input
            value={vigenereKey}
            onInput={(e: any) => {
              setVigenereKey(e.target.value);
              setVigenereError(null);
            }}
            placeholder="e.g. CIPHER"
            autoFocus
            maxLength={30}
          />
          {vigenereError && (
            <div style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: 600 }}>
              ⚠️ {vigenereError}
            </div>
          )}
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="⚠️ Reset Workbench?"
        confirmText="Reset to Payload"
        confirmVariant="danger"
        onConfirm={handleReset}
      >
        <p style={{ fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
          Are you sure you want to revert the workbench buffer back to the original intercepted payload? All intermediate transformations will be discarded.
        </p>
      </Modal>
    </div>
  );
};

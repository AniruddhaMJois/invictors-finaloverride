import { FunctionalComponent } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { STAGES_METADATA } from '../../../shared/types';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Card, Button, Input, Modal, CountdownRing } from '../components/common/UI';
import {
  teamState,
  isGlobalPaused,
  submitCooldown,
  showToast
} from '../store';
import { useAuthoritativeTimer } from '../hooks/useAuthoritativeTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { Stage1Module } from '../components/stages/Stage1Module';
import { Stage2Module } from '../components/stages/Stage2Module';
import {
  Stage3Module,
  Stage4Module,
  Stage5Module,
  Stage6Module
} from '../components/stages/StagePlaceholders';

interface GameDashboardProps {
  onOpenLeaderboard: () => void;
  onAdminClick: () => void;
}

export const GameDashboard: FunctionalComponent<GameDashboardProps> = ({
  onOpenLeaderboard,
  onAdminClick
}) => {
  const state = teamState.value;

  // DOM Refs for Zero-Render Timer
  const timerTextRef = useRef<HTMLSpanElement>(null);
  const ringCircleRef = useRef<SVGCircleElement>(null);
  useAuthoritativeTimer(timerTextRef, ringCircleRef);

  // Anti-Cheat Warning Modal
  const [showTabViolationModal, setShowTabViolationModal] = useState(false);
  useAntiCheat(() => setShowTabViolationModal(true));

  // Answer Submission State
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);

  // Selected Stage for Viewing (defaults to current)
  const currentStageNum = state?.currentStage || 1;
  const [viewStage, setViewStage] = useState(currentStageNum);

  // Sync viewStage when currentStage advances
  useEffect(() => {
    setViewStage(currentStageNum);
  }, [currentStageNum]);

  // Hint State
  const [confirmHintLevel, setConfirmHintLevel] = useState<1 | 2 | null>(null);
  const [activeHintSeconds, setActiveHintSeconds] = useState<{ [lvl: number]: number }>({});

  // Team Notepad Debounced Sync
  const [notepadContent, setNotepadContent] = useState(state?.notepadText || '');
  const notepadTimerRef = useRef<any>(null);

  useEffect(() => {
    if (state?.notepadText !== undefined && state.notepadText !== notepadContent) {
      setNotepadContent(state.notepadText);
    }
  }, [state?.notepadText]);

  function handleNotepadChange(text: string) {
    setNotepadContent(text);
    if (notepadTimerRef.current) clearTimeout(notepadTimerRef.current);
    notepadTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
      } catch (err) {
        console.error('Notes save error:', err);
      }
    }, 600);
  }

  // Answer Submission Handler
  async function handleSubmit(e?: Event) {
    if (e) e.preventDefault();
    if (isSubmitting || submitCooldown.value > 0 || !answerInput.trim() || !state) return;

    setIsSubmitting(true);
    setFeedback(null);

    // Start 1s client cooldown animation
    const cooldownStart = Date.now();
    const cooldownInterval = setInterval(() => {
      const elapsed = Date.now() - cooldownStart;
      const progress = 1 - Math.min(1, elapsed / 1000);
      submitCooldown.value = progress;
      if (progress <= 0) {
        clearInterval(cooldownInterval);
        submitCooldown.value = 0;
      }
    }, 50);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: state.currentStage,
          answer: answerInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.error || 'Submission rejected.', isError: true });
        setShakeCard(true);
        setTimeout(() => setShakeCard(false), 500);
        setIsSubmitting(false);
        return;
      }

      if (data.correct) {
        setFeedback({ text: `✅ Mission ${state.currentStage} cleared!`, isError: false });
        showToast(`✅ Mission ${state.currentStage} cleared!`, 'ok');
        setAnswerInput('');
      } else {
        const msg = data.message || `Not quite, try again 🙂 (Attempts: ${data.attempts}, penalty after 5)`;
        setFeedback({
          text: msg,
          isError: true
        });
        setShakeCard(true);
        setTimeout(() => setShakeCard(false), 500);
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Submission error.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Hint Unlock Handler
  async function handleUnlockHint(hintLevel: 1 | 2) {
    if (!state) return;
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: state.currentStage,
          n: hintLevel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to unlock hint.', 'bad');
        return;
      }

      showToast(`💡 Hint ${hintLevel} Unlocked (+${hintLevel === 1 ? '3' : '5'} min penalty)`, 'gold');
    } catch (err: any) {
      showToast(err.message || 'Network error.', 'bad');
    } finally {
      setConfirmHintLevel(null);
    }
  }

  // Countdown timer for active hints (30s)
  useEffect(() => {
    const timer = setInterval(() => {
      const hints = state?.hintsUsed?.[state?.currentStage || 1];
      if (!hints) return;

      const now = Date.now();
      const newSecs: { [lvl: number]: number } = {};

      for (const [lvl, h] of Object.entries(hints)) {
        const left = Math.max(0, Math.ceil((h.expiresAt - now) / 1000));
        newSecs[Number(lvl)] = left;
      }

      setActiveHintSeconds(newSecs);
    }, 500);

    return () => clearInterval(timer);
  }, [state?.hintsUsed, state?.currentStage]);

  // Copy to clipboard helper
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'ok');
  }

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔐</div>
            <p>Authentication required. Please return to landing page.</p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = '/')}
              style={{ marginTop: '14px' }}
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // VICTORY SCREEN COMPONENT
  if (state.isCompleted) {
    return (
      <VictoryScreen
        state={state}
        onOpenLeaderboard={onOpenLeaderboard}
        copyToClipboard={copyToClipboard}
      />
    );
  }

  const currentMeta = STAGES_METADATA.find((s) => s.id === viewStage) || STAGES_METADATA[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header compact onAdminClick={onAdminClick} />

      {/* Global Pause Overlay */}
      {isGlobalPaused.value && (
        <div
          style={{
            position: 'fixed',
            top: '52px',
            left: 0,
            right: 0,
            background: 'rgba(255, 184, 31, 0.95)',
            color: '#030813',
            padding: '10px 16px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '14px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>⏸</span> EVENT PAUSED BY ORGANISERS · CLOCKS FROZEN
        </div>
      )}

      {/* Sticky HUD Bar */}
      <div
        style={{
          background: 'rgba(8, 20, 44, 0.98)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: '52px',
          zIndex: 90,
          padding: '8px 16px'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px 16px'
          }}
        >
          {/* Team & Coordinator info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--cyan)' }}>
              {state.teamName}
            </div>
            <span style={{ color: 'var(--line)' }}>|</span>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Coord: <span style={{ color: 'var(--txt)' }}>{state.coordinator}</span>
            </div>
            {state.boundDevicesCount > 1 && (
              <span className="badge badge-blue">📱 {state.boundDevicesCount} devices</span>
            )}
          </div>

          {/* Right side: Authoritative Timer + Cap Ring + Penalties */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Penalty Chip */}
            {state.totalPenaltySeconds > 0 && (
              <span className="badge badge-bad" title="Total Penalties added to final rank time">
                +{Math.round(state.totalPenaltySeconds / 60)} min
              </span>
            )}

            {/* Timer Display with Single Text Node */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                ref={timerTextRef}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: 'var(--txt)'
                }}
              >
                00:00
              </span>

              {/* 90-min Hard Cap Ring (r=22, circum=138.2) */}
              <svg width="28" height="28" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="14" cy="14" r="11" fill="none" stroke="var(--bg2)" stroke-width="3" />
                <circle
                  ref={ringCircleRef}
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="3"
                  stroke-dasharray="69.1"
                  stroke-dashoffset="0"
                  stroke-linecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '16px',
          width: '100%'
        }}
      >
        {/* Desktop 2-column or Mobile Stack */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            alignItems: 'start'
          }}
        >
          {/* Left Column (~65%): Stage Rail + Active Stage Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {/* Horizontal Stage Rail */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none'
              }}
            >
              {STAGES_METADATA.map((stg) => {
                const isDone = stg.id < currentStageNum;
                const isCurrent = stg.id === currentStageNum;
                const isLocked = stg.id > currentStageNum;
                const isViewing = viewStage === stg.id;

                let border = '1px solid var(--line)';
                let bg = 'var(--card)';
                let color = 'var(--txt)';

                if (isDone) {
                  border = '1px solid var(--ok)';
                  color = 'var(--ok)';
                } else if (isCurrent) {
                  border = '1px solid var(--gold)';
                  bg = 'rgba(255, 184, 31, 0.1)';
                  color = 'var(--gold)';
                } else if (isLocked) {
                  color = 'var(--muted)';
                  opacity: 0.6;
                }

                return (
                  <button
                    key={stg.id}
                    onClick={() => {
                      if (!isLocked) setViewStage(stg.id);
                    }}
                    disabled={isLocked}
                    className={isCurrent ? 'animate-pulse-gold' : ''}
                    style={{
                      flex: '0 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--r-sm)',
                      background: isViewing ? 'rgba(39, 180, 255, 0.15)' : bg,
                      border: isViewing ? '1px solid var(--accent)' : border,
                      color,
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>{stg.icon}</span>
                    <span>Stage {stg.id}</span>
                    {isDone && <span style={{ color: 'var(--ok)' }}>✓</span>}
                    {isLocked && <span style={{ fontSize: '11px', opacity: 0.7 }}>🔒</span>}
                  </button>
                );
              })}
            </div>

            {/* Stage Card Shell */}
            <Card className={shakeCard ? 'animate-shake' : ''}>
              {/* Stage Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '12px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{currentMeta.icon}</span>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)' }}>
                      Stage {currentMeta.id}: {currentMeta.displayName}
                    </h2>
                  </div>
                  {currentMeta.subtitle && (
                    <div style={{ fontSize: '12px', color: 'var(--cyan)', marginTop: '2px' }}>
                      {currentMeta.subtitle}
                    </div>
                  )}
                </div>

                <span className="badge badge-blue">⏱ Avg: {currentMeta.avgTime}</span>
              </div>

              {/* Stage Content Slot */}
              {viewStage === 1 && <Stage1Module />}
              {viewStage === 2 && <Stage2Module />}
              {viewStage === 3 && <Stage3Module />}
              {viewStage === 4 && <Stage4Module />}
              {viewStage === 5 && <Stage5Module />}
              {viewStage === 6 && <Stage6Module />}

              {/* Answer Submission Bar */}
              {viewStage === currentStageNum ? (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: '16px',
                    marginTop: '20px'
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--cyan)',
                      marginBottom: '8px'
                    }}
                  >
                    ENTER RECOVERED FRAGMENT / OVERRIDE KEY:
                  </label>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Input
                      value={answerInput}
                      onInput={(e: any) => setAnswerInput(e.target.value)}
                      placeholder={
                        currentStageNum === 6
                          ? 'FO{...}#checksum'
                          : `Enter Stage ${currentStageNum} solution fragment`
                      }
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="gold"
                      disabled={isSubmitting || submitCooldown.value > 0 || !answerInput.trim()}
                      cooldownProgress={submitCooldown.value}
                      style={{ minWidth: '110px' }}
                    >
                      {submitCooldown.value > 0 ? 'Wait 1s...' : 'Submit ✅'}
                    </Button>
                  </div>

                  {/* Live Feedback Line */}
                  {feedback && (
                    <div
                      aria-live="polite"
                      style={{
                        marginTop: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: feedback.isError ? 'var(--bad)' : 'var(--ok)'
                      }}
                    >
                      {feedback.text}
                    </div>
                  )}
                </form>
              ) : (
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: '14px',
                    marginTop: '16px',
                    color: 'var(--ok)',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  ✓ Stage {viewStage} is already cleared! Fragment recovered:{' '}
                  <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                    {state.fragments[viewStage] || 'SAVED'}
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (~35%, sticky): Notebook, Hints, Notepad, Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Fragment Notebook */}
            <Card>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📒</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold)' }}>
                    Fragment Notebook
                  </h3>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Tap to copy</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((stgNum) => {
                  const frag = state.fragments[stgNum];
                  return (
                    <div
                      key={stgNum}
                      onClick={() => frag && copyToClipboard(frag, `Mission ${stgNum} Fragment`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--bg2)',
                        border: `1px solid ${frag ? 'var(--ok)' : 'var(--line)'}`,
                        borderRadius: 'var(--r-sm)',
                        cursor: frag ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                        M{stgNum} ({STAGES_METADATA[stgNum - 1].sortName}):
                      </span>
                      {frag ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--cyan)',
                            fontWeight: 700
                          }}
                        >
                          {frag} ✓
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>🔒 Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Hint Panel */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span>💡</span>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
                  Tactical Intelligence (Hints)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Hint 1 */}
                <HintSlot
                  stageNum={currentStageNum}
                  hintLevel={1}
                  penaltyText="+3 min"
                  hintData={state.hintsUsed?.[currentStageNum]?.[1]}
                  secondsLeft={activeHintSeconds[1]}
                  onUnlock={() => setConfirmHintLevel(1)}
                />

                {/* Hint 2 (Requires Hint 1) */}
                <HintSlot
                  stageNum={currentStageNum}
                  hintLevel={2}
                  penaltyText="+5 min"
                  hintData={state.hintsUsed?.[currentStageNum]?.[2]}
                  secondsLeft={activeHintSeconds[2]}
                  disabled={!state.hintsUsed?.[currentStageNum]?.[1]}
                  onUnlock={() => setConfirmHintLevel(2)}
                />
              </div>
            </Card>

            {/* Team Notepad (Synced) */}
            <Card>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📝</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--txt)' }}>
                    Squad Shared Notepad
                  </h3>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Live sync</span>
              </div>
              <textarea
                value={notepadContent}
                onInput={(e: any) => handleNotepadChange(e.target.value)}
                placeholder="Jot down clues, like the access phrase 🗝️"
                className="textarea"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </Card>

            {/* Squad Members Roster */}
            <Card>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>
                SQUAD ROSTER
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {state.members.map((m) => (
                  <span key={m.id || m.name} className="badge badge-blue">
                    {m.isLeader ? '👑 ' : '👤 '}
                    {m.name}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer compact />

      {/* Hint Confirmation Modal */}
      <Modal
        isOpen={confirmHintLevel !== null}
        onClose={() => setConfirmHintLevel(null)}
        title={`Unlock Hint ${confirmHintLevel}?`}
        confirmText="Confirm & Reveal (+Penalty)"
        onConfirm={() => confirmHintLevel && handleUnlockHint(confirmHintLevel)}
        confirmVariant="gold"
      >
        <p style={{ lineHeight: 1.5, fontSize: '14px' }}>
          Unlocking Hint {confirmHintLevel} will add{' '}
          <strong style={{ color: 'var(--bad)' }}>
            {confirmHintLevel === 1 ? '3 minutes (180s)' : '5 minutes (300s)'}
          </strong>{' '}
          to your squad's final rank time.
        </p>
        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--gold)' }}>
          ⚠️ The hint will only be visible for <strong>30 seconds</strong>, after which it permanently locks!
        </p>
      </Modal>

      {/* Tab Switch Penalty Modal */}
      <Modal
        isOpen={showTabViolationModal}
        onClose={() => setShowTabViolationModal(false)}
        title="⚠️ Security Alert: Tab Switch Detected"
        confirmText="Acknowledge & Continue"
        onConfirm={() => setShowTabViolationModal(false)}
        confirmVariant="danger"
      >
        <p style={{ lineHeight: 1.5, fontSize: '14px' }}>
          Your browser lost focus or switched tabs during active engagement.
        </p>
        <div
          style={{
            margin: '12px 0',
            padding: '10px',
            background: 'rgba(255, 93, 108, 0.1)',
            border: '1px solid var(--bad)',
            borderRadius: '6px',
            color: 'var(--bad)',
            fontWeight: 700
          }}
        >
          +2 Minutes Penalty Added to Squad Clock
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Please keep this tab active and open at all times to prevent future violations.
        </p>
      </Modal>
    </div>
  );
};

// Subcomponent: Individual Hint Slot
function HintSlot({
  stageNum,
  hintLevel,
  penaltyText,
  hintData,
  secondsLeft,
  disabled = false,
  onUnlock
}: {
  stageNum: number;
  hintLevel: 1 | 2;
  penaltyText: string;
  hintData?: { text?: string | null; expiresAt: number };
  secondsLeft?: number;
  disabled?: boolean;
  onUnlock: () => void;
}) {
  const isUnlocked = !!hintData;
  const isExpired = hintData && (!hintData.text || (secondsLeft !== undefined && secondsLeft <= 0));

  if (!isUnlocked) {
    return (
      <Button
        variant="ghost"
        onClick={onUnlock}
        disabled={disabled}
        style={{ width: '100%', justifyContent: 'space-between', fontSize: '12px' }}
      >
        <span>💡 Hint {hintLevel}</span>
        <span style={{ color: 'var(--amber)' }}>{penaltyText}</span>
      </Button>
    );
  }

  if (isExpired) {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)',
          fontSize: '12px',
          color: 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>🔒 Hint {hintLevel} Expired & Locked</span>
      </div>
    );
  }

  // Active (within 30s)
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(39, 180, 255, 0.08)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--r-sm)',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>💡 Hint {hintLevel} Active:</span>
        <CountdownRing secondsLeft={secondsLeft || 30} totalSeconds={30} size={28} strokeWidth={3} />
      </div>
      <div style={{ color: 'var(--txt)', lineHeight: 1.4, fontWeight: 500 }}>
        {hintData.text || 'Loading hint...'}
      </div>
    </div>
  );
}

// Victory Screen
function VictoryScreen({
  state,
  onOpenLeaderboard,
  copyToClipboard
}: {
  state: any;
  onOpenLeaderboard: () => void;
  copyToClipboard: (t: string, l: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#27b4ff', '#ffb81f', '#34d399', '#6fe3ff', '#ff5d6c'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
      });
    }

    const startTime = Date.now();
    let animId: number;

    function render() {
      const elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
        return;
      }

      ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rotation += p.vr;

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();
      }

      animId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalElapsedSec = Math.floor(Math.max(0, (state.endTime || Date.now()) - state.startTime) / 1000);
  const finalRankSec = totalElapsedSec + state.totalPenaltySeconds;

  const fmtMinSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}
      />

      <div style={{ maxWidth: '600px', width: '100%', zIndex: 10 }}>
        <Card glow style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              background: 'var(--grad-title)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px'
            }}
          >
            SYSTEM UNLOCKED
          </h1>
          <p style={{ color: 'var(--cyan)', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
            Congratulations, Squad {state.teamName}!
          </p>

          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>Mission Elapsed Time:</span>
              <strong style={{ color: 'var(--txt)' }}>{fmtMinSec(totalElapsedSec)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>Total Penalties:</span>
              <span style={{ color: 'var(--bad)' }}>+{fmtMinSec(state.totalPenaltySeconds)}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', paddingLeft: '8px', marginBottom: '8px' }}>
              · Hints: +{Math.round(state.penaltyBreakdown.hints / 60)}m · Tab Switches: +
              {Math.round(state.penaltyBreakdown.tabSwitches / 60)}m · Wrong Attempts: +
              {Math.round(state.penaltyBreakdown.wrongAttempts / 60)}m
            </div>
            <div
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 800
              }}
            >
              <span style={{ color: 'var(--gold)' }}>Final Official Rank Time:</span>
              <span style={{ color: 'var(--gold)' }}>{fmtMinSec(finalRankSec)}</span>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(39, 180, 255, 0.08)',
              border: '1px dashed var(--accent)',
              borderRadius: 'var(--r-sm)',
              padding: '12px',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
              OFFICIAL VERIFICATION HASH
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--cyan)',
                letterSpacing: '2px'
              }}
            >
              {state.verificationCode || 'VERIFIED'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '4px' }}>
              Show this screen to your coordinator ({state.coordinator}) for final verification.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              variant="ghost"
              onClick={() =>
                copyToClipboard(
                  `FINAL OVERRIDE VICTORY: Squad ${state.teamName} completed the challenge in ${fmtMinSec(
                    finalRankSec
                  )}! Hash: ${state.verificationCode}`,
                  'Victory Summary'
                )
              }
            >
              📋 Copy Result
            </Button>
            <Button variant="gold" onClick={onOpenLeaderboard}>
              🏆 View Leaderboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

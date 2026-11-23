'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common/UI';
import { useSignal, teamState, showToast } from '@/store';

interface StageMission {
  stageId: number;
  missionName: string;
  defaultFragment: string;
  icon: string;
}

const STAGE_MISSIONS: StageMission[] = [
  { stageId: 1, missionName: 'Signal Intercept', defaultFragment: 'NOVA', icon: '📡' },
  { stageId: 2, missionName: 'Decoding', defaultFragment: '7K2', icon: '🔓' },
  { stageId: 3, missionName: 'Prompt the AI', defaultFragment: 'ORBIT', icon: '🤖' },
  { stageId: 4, missionName: 'CTF Challenges', defaultFragment: '91X', icon: '🛡️' },
  { stageId: 5, missionName: 'Hex Decryption', defaultFragment: 'HEX82D', icon: '⚡' }
];

const SET_DEFAULTS: Record<string, Record<number, string>> = {
  A: { 1: 'NOVA', 2: '7K2', 3: 'ORBIT', 4: '91X', 5: 'HEX82D' },
  B: { 1: 'LUNA', 2: '4M9', 3: 'SOLAR', 4: '84Z', 5: 'CORE7F' },
  C: { 1: 'VEGA', 2: '3X8', 3: 'TITAN', 4: '72Y', 5: 'BYTE9A' },
  D: { 1: 'MARS', 2: '5P3', 3: 'ZENITH', 4: '63K', 5: 'BITS1E' },
  E: { 1: 'ECHO', 2: '2D5', 3: 'ALPHA', 4: '57W', 5: 'SYNC3C' }
};

export const Stage6Module: React.FC = () => {
  const state = useSignal(teamState);
  const fragments = (state && state.fragments) || {};
  const assignedSet = (state as any)?.setId || 'A';
  const setDefaults = SET_DEFAULTS[assignedSet] || SET_DEFAULTS.A;

  // Candidate answer typed by participant in the FO{} skeleton
  const [candidateKey, setCandidateKey] = useState('FO{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Sync candidateKey to global answer bar if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: 'FO{}' }));
    }
  }, []);

  function getRawFragment(slot: StageMission): string {
    return fragments[slot.stageId] || setDefaults[slot.stageId] || slot.defaultFragment;
  }

  function copyFragment(text: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast(`Copied ${label} ("${text}") to clipboard!`, 'ok');
  }

  function handleTransferToSolutionBar(valToTransfer?: string) {
    const text = valToTransfer || candidateKey;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: text }));
    }
    showToast('Loaded candidate key into solution submission bar! ⬇️', 'ok');
  }

  // Live syntax inspection (without giving away the correct solution)
  const startsWithFO = candidateKey.startsWith('FO{');
  const hasClosingBrace = candidateKey.includes('}');
  const hasChecksumMarker = candidateKey.includes('#');

  // Extract content inside FO{...}
  const matchInside = candidateKey.match(/^FO\{([^}]+)\}(?:#(\d+))?/i);
  const innerContent = matchInside ? matchInside[1] : '';
  const typedChecksum = matchInside && matchInside[2] !== undefined ? matchInside[2] : null;

  // Extract individual digits inside the braces to assist user with verifying arithmetic
  const detectedDigits: number[] = [];
  if (innerContent) {
    for (const ch of innerContent) {
      if (/[0-9]/.test(ch)) {
        detectedDigits.push(parseInt(ch, 10));
      }
    }
  }
  const computedDigitSum = detectedDigits.reduce((acc, curr) => acc + curr, 0);

  // Direct submit from Stage 6 module
  async function handleSubmitOverride() {
    const clean = candidateKey.trim();
    if (!clean || isSubmitting) return;

    if (!clean.startsWith('FO{') || !clean.includes('}')) {
      setFeedback({ text: 'Invalid key skeleton. Format must begin with FO{ and close with }#<checksum>.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 6, answer: clean })
      });

      const data = await res.json();
      if (!res.ok || !data.correct) {
        setFeedback({
          text: data.message || 'Override Rejected: Incorrect combination or checksum. Re-verify fragment ordering, reversal, and digit sum.',
          isError: true
        });
        showToast('❌ Override Rejected. Check your sequence and checksum.', 'bad');
      } else {
        setFeedback({ text: '🎉 SYSTEM OVERRIDDEN! Victory sequence initiated!', isError: false });
        showToast('🎉 FINAL OVERRIDE SUCCESSFUL! CONGRATULATIONS!', 'ok');
        // Refresh team state to display mission accomplished
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setFeedback({ text: 'Network error communicating with central core.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Mission Briefing & Context */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🧩</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
                  Stage 6: Final Integration & Master Override Synthesis
                </h3>
                <span className="badge badge-gold">FINAL STAGE</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                ⚡ Core System Lockout // Cryptographic Key Assembly
              </span>
            </div>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            Operative, all 5 security perimeters have been breached and their individual security fragments recovered! 
            The central mainframe will <strong>not</strong> grant final access until you synthesize all previous answers 
            into the official Master Override Key.
          </p>

          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--gold)',
              background: 'rgba(255, 184, 31, 0.08)',
              padding: '10px 14px',
              borderRadius: '6px',
              borderLeft: '3px solid var(--gold)',
              lineHeight: '1.5'
            }}
          >
            ⚠️ <strong>Crucial Warning:</strong> Do NOT guess blindly. You must deduce the proper ordering and 
            transformations of your 5 recovered answers by following the cryptographic protocol directives below.
          </div>
        </div>
      </Card>

      {/* 2. Recovered Stage Fragments Vault */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
              📦 Your 5 Recovered Mission Fragments
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Recovered in Stages 1 through 5
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}
          >
            {STAGE_MISSIONS.map((slot) => {
              const rawFrag = getRawFragment(slot);
              return (
                <div
                  key={slot.stageId}
                  style={{
                    background: 'rgba(6, 18, 38, 0.85)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                      {slot.icon} STAGE {slot.stageId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyFragment(rawFrag, `Stage ${slot.stageId}`)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--cyan)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Copy Fragment"
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                    {slot.missionName}
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--cyan)',
                      background: 'rgba(39, 180, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(39, 180, 255, 0.3)',
                      textAlign: 'center',
                      letterSpacing: '1px'
                    }}
                  >
                    {rawFrag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 3. Cryptographic Protocol Directives (Combination Rules) */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--gold)' }}>
            📜 Master Key Synthesis Protocol
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Rule 1: Skeleton */}
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.6)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>1️⃣</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--txt)' }}>
                <strong>The Master Skeleton:</strong> The final key must strictly follow the format:{' '}
                <code style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                  FO&#123;&lt;part1&gt;-&lt;part2&gt;-&lt;part3&gt;-&lt;part4&gt;-&lt;part5&gt;&#125;#&lt;checksum&gt;
                </code>
                . All 5 parts must be separated by single hyphens inside the curly braces.
              </div>
            </div>

            {/* Rule 2: Order / Combination */}
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.6)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>2️⃣</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--txt)' }}>
                <strong>Sequence & Combinations:</strong> Do NOT put the fragments in simple stage order (1-2-3-4-5)!{' '}
                The mainframe requires the 5 missions to be sequenced <strong>alphabetically (A → Z) by their Official Mission Name</strong>:
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  <em>Hint: Check the names: CTF Challenges, Decoding, Hex Decryption, Prompt the AI, Signal Intercept.</em>
                </div>
              </div>
            </div>

            {/* Rule 3: Reversal Transformation */}
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.6)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>3️⃣</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--txt)' }}>
                <strong>Polarity Inversion:</strong> The code retrieved from <strong>Prompt the AI (Stage 3)</strong>{' '}
                experienced reverse polarity in WARDEN's memory core. You must <strong>REVERSE</strong> its characters before inserting it into the key (e.g. if code is <code>ABC</code>, use <code>CBA</code>).
              </div>
            </div>

            {/* Rule 4: Checksum Calculation */}
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.6)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '16px' }}>4️⃣</span>
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--txt)' }}>
                <strong>Digit Checksum (`#&lt;checksum&gt;`):</strong> At the end of the key, append <code>#</code> followed by the sum of <strong>every single numeric digit (0–9)</strong> that appears inside the <code>&#123;...&#125;</code> braces. Letters are ignored.
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                  <em>Example: If your inner string has digits 9, 1, 7, 2, 8, 2, the checksum is 9 + 1 + 7 + 2 + 8 + 2 = 29.</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Interactive Master Skeleton Workbench FO{} */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--cyan)' }}>
              ⌨️ Master Key Terminal Skeleton: <code>FO&#123;&#125;</code>
            </h4>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setCandidateKey('FO{}');
                  handleTransferToSolutionBar('FO{}');
                }}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                🔄 Reset to FO&#123;&#125;
              </Button>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Type and assemble your candidate override key directly into the skeleton below. Test combinations of your previous answers until you unlock the vault:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={candidateKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setCandidateKey(val);
                  handleTransferToSolutionBar(val);
                  if (feedback) setFeedback(null);
                }}
                placeholder="FO{part1-part2-part3-part4-part5}#checksum"
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '12px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: '6px',
                  color: 'var(--txt)',
                  outline: 'none'
                }}
              />
              <Button
                variant="gold"
                onClick={handleSubmitOverride}
                disabled={isSubmitting || !candidateKey.trim()}
                style={{ padding: '0 20px', fontWeight: 800 }}
              >
                {isSubmitting ? 'Verifying...' : 'Submit Override 🚀'}
              </Button>
            </div>

            {/* Diagnostic Assistant for the participant */}
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.75)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ color: startsWithFO ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                  {startsWithFO ? '✓ Starts with FO{' : '✗ Must start with FO{'}
                </span>
                <span style={{ color: hasClosingBrace ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                  {hasClosingBrace ? '✓ Contains closing }' : '✗ Missing closing }'}
                </span>
                <span style={{ color: hasChecksumMarker ? 'var(--ok)' : 'var(--gold)', fontWeight: 600 }}>
                  {hasChecksumMarker ? '✓ # Checksum present' : '⚠️ Missing #<checksum> at end'}
                </span>
              </div>

              {innerContent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--muted)' }}>Detected digits inside braces:</span>
                  {detectedDigits.length > 0 ? (
                    <>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        {detectedDigits.join(' + ')}
                      </span>
                      <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                        = {computedDigitSum}
                      </span>
                      {typedChecksum !== null && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontWeight: 700,
                            color: parseInt(typedChecksum, 10) === computedDigitSum ? 'var(--ok)' : 'var(--bad)'
                          }}
                        >
                          (Typed #{typedChecksum} {parseInt(typedChecksum, 10) === computedDigitSum ? '✓ Checksum Match' : '✗ Checksum Mismatch'})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                      None detected yet
                    </span>
                  )}
                </div>
              )}
            </div>

            {feedback && (
              <div
                aria-live="polite"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: feedback.isError ? 'var(--bad)' : 'var(--ok)',
                  background: feedback.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: feedback.isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '6px'
                }}
              >
                {feedback.text}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

'use client';

import React from 'react';
import { Card, Button } from '../common/UI';
import { useSignal, teamState, showToast } from '@/store';

interface SynthesisSlot {
  order: number;
  stageId: number;
  missionName: string;
  keyVar: string;
  isReversed: boolean;
  defaultFragment: string;
}

const MISSIONS: SynthesisSlot[] = [
  { order: 1, stageId: 4, missionName: 'CTF Challenges', keyVar: 'f4', isReversed: false, defaultFragment: '91X' },
  { order: 2, stageId: 2, missionName: 'Decoding', keyVar: 'f2', isReversed: false, defaultFragment: '7K2' },
  { order: 3, stageId: 5, missionName: 'Hex Decryption', keyVar: 'f5', isReversed: false, defaultFragment: 'HEX82D' },
  { order: 4, stageId: 3, missionName: 'Prompt the AI', keyVar: 'reverse(f3)', isReversed: true, defaultFragment: 'ORBIT' },
  { order: 5, stageId: 1, missionName: 'Signal Intercept', keyVar: 'f1', isReversed: false, defaultFragment: 'NOVA' }
];

export const Stage6Module: React.FC = () => {
  const state = useSignal(teamState);
  const fragments = (state && state.fragments) || {};

  function getFragment(slot: SynthesisSlot): { raw: string; active: string } {
    const raw = fragments[slot.stageId] || slot.defaultFragment;
    const active = slot.isReversed ? raw.split('').reverse().join('') : raw;
    return { raw, active };
  }

  const assembledParts = MISSIONS.map((m) => getFragment(m).active);
  const keyBody = assembledParts.join('-');

  const digitsInBody: { digit: number; source: string }[] = [];
  MISSIONS.forEach((m) => {
    const { active } = getFragment(m);
    for (const ch of active) {
      if (/[0-9]/.test(ch)) {
        digitsInBody.push({ digit: parseInt(ch, 10), source: m.missionName });
      }
    }
  });

  const checksum = digitsInBody.reduce((acc, curr) => acc + curr.digit, 0);
  const finalKey = `FO{${keyBody}}#${checksum}`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'ok');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Synthesis Directive */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🧩</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
                Stage 6: Final Integration & Master Override Synthesis
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>
                ⚡ The Culmination Challenge
              </span>
            </div>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            📖 The story: All 5 security fragments have been recovered! 🧩 To forge the master override key, sort the 5 missions alphabetically by their official mission name. Reverse the AI Guardian fragment, calculate the digit checksum, and execute the final override!
          </p>

          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--cyan)',
              background: 'rgba(39, 180, 255, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              borderLeft: '3px solid var(--accent)'
            }}
          >
            💡 Format Rule: <code>FO&#123;f4-f2-f5-reverse(f3)-f1&#125;#&lt;checksum&gt;</code>. The checksum is the sum of every single digit (0–9) appearing inside the curly braces.
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', paddingTop: '2px' }}>
            ✍️ Assemble the master key and submit below to initiate the final override.
          </div>
        </div>
      </Card>

      {/* 2. Alphabetical Fragment Assembly Breakdown */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--gold)' }}>
              1. Alphabetical (A–Z) Mission Order
            </h4>
            <span className="badge badge-blue">A → Z Sort by Name</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MISSIONS.map((slot) => {
              const { raw, active } = getFragment(slot);
              return (
                <div
                  key={slot.order}
                  style={{
                    background: 'rgba(6, 18, 38, 0.75)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        fontWeight: 800,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {slot.order}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                        {slot.missionName}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Stage {slot.stageId} ({slot.keyVar})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {slot.isReversed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                          {raw}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--cyan)' }}>↻ REVERSED →</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '15px',
                            fontWeight: 800,
                            color: 'var(--ok)',
                            background: 'rgba(52, 211, 153, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--ok)'
                          }}
                        >
                          {active}
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--cyan)',
                          background: 'rgba(39, 180, 255, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(39, 180, 255, 0.4)'
                        }}
                      >
                        {active}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 3. Checksum Breakdown & Final Key Synthesizer */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--gold)' }}>
              2. Digit Checksum Calculation
            </h4>
            <span className="badge badge-gold">Sum of Digits = {checksum}</span>
          </div>

          <div
            style={{
              background: 'var(--bg)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
              Single Digits (0–9):
            </span>
            {digitsInBody.map((item, idx) => (
              <span
                key={idx}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--gold)',
                  background: 'rgba(255, 184, 31, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 184, 31, 0.3)'
                }}
              >
                {item.digit}
                {idx < digitsInBody.length - 1 ? ' +' : ''}
              </span>
            ))}
            <span style={{ fontWeight: 800, color: 'var(--ok)', fontSize: '15px', marginLeft: '6px' }}>
              = {checksum}
            </span>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, rgba(8, 20, 44, 0.95), rgba(6, 18, 38, 0.95))',
              border: '1px solid var(--accent)',
              boxShadow: '0 0 16px rgba(39, 180, 255, 0.2)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                ASSEMBLED MASTER OVERRIDE KEY
              </span>
              <Button
                variant="gold"
                onClick={() => copyToClipboard(finalKey, 'Master Override Key')}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                📋 Copy Master Key
              </Button>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '16px',
                fontWeight: 800,
                color: '#ffffff',
                wordBreak: 'break-all',
                background: 'var(--bg)',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                textAlign: 'center',
                letterSpacing: '0.5px'
              }}
            >
              {finalKey}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

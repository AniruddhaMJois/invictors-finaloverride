'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common/UI';
import { showToast } from '@/store';

interface ChannelRow {
  channel: string;
  bytes: string[];
  activeIndex: number;
}

export const Stage5Module: React.FC = () => {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [activeBusBytes, setActiveBusBytes] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState<string>('');
  const [decodedText, setDecodedText] = useState<string>('');
  const [breakdown, setBreakdown] = useState<{ hex: string; char: string }[]>([]);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStage5() {
      try {
        const res = await fetch('/api/stage/5');
        if (!res.ok) throw new Error('Failed to load Stage 5 data');
        const data = await res.json();
        if (Array.isArray(data.channels)) {
          setChannels(data.channels);
        }
        if (Array.isArray(data.activeBusBytes)) {
          setActiveBusBytes(data.activeBusBytes);
        }
      } catch (err) {
        console.error('Stage 5 load error:', err);
      }
    }

    loadStage5();
  }, []);

  function handleReadBusLine() {
    const busString = activeBusBytes.join(' ');
    setHexInput(busString);
    setDecodeError(null);
    showToast('Active Bus Line 1 bytes extracted!', 'ok');
  }

  function handleDecodeHex() {
    setDecodeError(null);
    const clean = hexInput.replace(/^0x|\s+/gi, '');
    if (!clean) {
      setDecodeError('Please enter or extract hexadecimal bytes to decode.');
      return;
    }

    if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
      setDecodeError('Invalid hexadecimal format. Must be byte pairs (0-9, A-F).');
      return;
    }

    let ascii = '';
    const parts: { hex: string; char: string }[] = [];

    for (let i = 0; i < clean.length; i += 2) {
      const hexByte = clean.substring(i, i + 2).toUpperCase();
      const code = parseInt(hexByte, 16);
      const char = String.fromCharCode(code);
      ascii += char;
      parts.push({ hex: hexByte, char });
    }

    setDecodedText(ascii);
    setBreakdown(parts);
    showToast(`Decoded: ${ascii}`, 'ok');
  }

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: text }));
    }
    showToast(`Copied & filled "${text}" into solution bar!`, 'ok');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Directives */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🧠</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
                Stage 5: Hexadecimal Memory Core & Bus Decoupler
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                ⚡ High-Voltage Register Matrix
              </span>
            </div>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            📖 The story: The vault’s memory core is pulsing with raw hexadecimal data! 🧠 Six high-frequency channels (A through F) are dumping 4-column registers. The decoupled active high-voltage data bus line runs along Column 1. Decouple it and translate the bytes into ASCII.
          </p>

          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--cyan)',
              background: 'rgba(39, 180, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '6px',
              borderLeft: '3px solid var(--accent)'
            }}
          >
            💡 Tip: Read Column 1 across Channels A through F. Each byte represents an ASCII character in hexadecimal (0x48 &rarr; H).
          </div>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', paddingTop: '2px' }}>
            ✍️ Decode the active bus line bytes into ASCII text and enter the fragment below.
          </div>
        </div>
      </Card>

      {/* 2. 6x4 Memory Core Matrix Display */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📟</span>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--gold)' }}>
                6×4 Register Memory Matrix
              </h4>
            </div>
            <span className="badge badge-blue">Channels A–F × 4 Cols</span>
          </div>

          <div
            style={{
              overflowX: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              background: 'var(--bg)'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                textAlign: 'center'
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '11px' }}>
                  <th style={{ padding: '8px', textAlign: 'left', width: '120px' }}>CHANNEL</th>
                  <th style={{ padding: '8px' }}>COL 0</th>
                  <th
                    style={{
                      padding: '8px',
                      background: 'rgba(39, 180, 255, 0.15)',
                      color: 'var(--accent)',
                      borderLeft: '1px solid var(--accent)',
                      borderRight: '1px solid var(--accent)',
                      fontWeight: 800
                    }}
                  >
                    ⚡ COL 1 (ACTIVE BUS)
                  </th>
                  <th style={{ padding: '8px' }}>COL 2</th>
                  <th style={{ padding: '8px' }}>COL 3</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(29, 79, 143, 0.25)' }}>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: 'var(--cyan)',
                        background: 'rgba(6, 18, 38, 0.6)'
                      }}
                    >
                      {row.channel}
                    </td>
                    {row.bytes.map((byte, cIdx) => {
                      const isActive = cIdx === row.activeIndex;
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: '10px 8px',
                            fontWeight: isActive ? 800 : 500,
                            color: isActive ? '#ffffff' : 'var(--muted)',
                            background: isActive
                              ? 'linear-gradient(180deg, rgba(39, 180, 255, 0.22), rgba(6, 18, 38, 0.8))'
                              : 'transparent',
                            borderLeft: isActive ? '1px solid var(--accent)' : 'none',
                            borderRight: isActive ? '1px solid var(--accent)' : 'none',
                            textShadow: isActive ? '0 0 10px var(--accent)' : 'none',
                            fontSize: isActive ? '15px' : '13px'
                          }}
                        >
                          {byte}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 3. Hex Decoder Workbench */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛠️</span>
              <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gold)' }}>
                Hexadecimal Decoder Workbench
              </h4>
            </div>

            <Button
              variant="primary"
              onClick={handleReadBusLine}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>⚡</span>
              <span>Read Active Bus Line</span>
            </Button>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--muted)',
                marginBottom: '6px',
                letterSpacing: '0.5px'
              }}
            >
              HEXADECIMAL SEQUENCE TO DECODE
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Input
                value={hexInput}
                onChange={(e) => {
                  setHexInput(e.target.value);
                  setDecodeError(null);
                }}
                placeholder="e.g. 48 45 58 38 32 44"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '1px',
                  fontWeight: 700
                }}
              />
              <Button
                variant="gold"
                onClick={handleDecodeHex}
                disabled={!hexInput.trim()}
                style={{ minWidth: '150px' }}
              >
                Decode Hex to Text 🔤
              </Button>
            </div>
            {decodeError && (
              <div style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                ⚠️ {decodeError}
              </div>
            )}
          </div>

          {decodedText && (
            <div
              style={{
                background: 'rgba(6, 18, 38, 0.9)',
                borderRadius: '8px',
                border: '1px solid var(--accent)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                  ASCII TRANSLATION BREAKDOWN
                </span>
                <Button
                  variant="ghost"
                  onClick={() => copyToClipboard(decodedText, 'Decoded Fragment')}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  📋 Copy &quot;{decodedText}&quot;
                </Button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(39, 180, 255, 0.12)',
                      border: '1px solid rgba(39, 180, 255, 0.4)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>0x{item.hex}</span>
                    <span style={{ color: 'var(--accent)' }}>→</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '15px' }}>
                      &apos;{item.char}&apos;
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(29, 79, 143, 0.4)',
                  paddingTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                  Recovered Fragment:
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--ok)',
                    background: 'rgba(52, 211, 153, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--ok)'
                  }}
                >
                  {decodedText}
                </span>
                <Button
                  variant="gold"
                  onClick={() => copyToClipboard(decodedText, 'Decoded Fragment')}
                  style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}
                >
                  Fill into Solution Bar ➡️
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

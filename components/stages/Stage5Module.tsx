'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common/UI';
import { showToast } from '@/store';

interface ChannelRow {
  channel: string;
  seqNumber?: number;
  seqLabel?: string;
  bytes: string[];
  activeIndex: number;
}

export const Stage5Module: React.FC = () => {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [activeBusBytes, setActiveBusBytes] = useState<string[]>([]);
  const [routingOrder, setRoutingOrder] = useState<string[]>([]);
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
        if (Array.isArray(data.routingOrder)) {
          setRoutingOrder(data.routingOrder);
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
    showToast('Active Column 1 raw bytes extracted!', 'ok');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🧠</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
                Stage 5: Hexadecimal Memory Core & Bus Decoupler
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                ⚡ Multi-Channel High-Voltage Register Matrix
              </span>
            </div>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ margin: 0 }}>
              📖 <strong>Mission Briefing:</strong> The vault’s memory register core has dumped volatile machine code across 6 parallel hardware channels (<strong>Channel A through F</strong>). A 6-byte cryptographic key fragment is carried inside the high-voltage data bus line (<strong>Column 1</strong>).
            </p>
            <p style={{ margin: 0 }}>
              ⚠️ <strong>Hardware Multiplexing:</strong> To secure the mainframe against memory dumping in this competition, the register bytes along the active column have been <em>scrambled across channels</em>. They do not appear in sequential order from top to bottom!
            </p>
          </div>

          <div
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'var(--cyan)',
              background: 'rgba(39, 180, 255, 0.08)',
              padding: '10px 14px',
              borderRadius: '6px',
              borderLeft: '3px solid var(--accent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <strong style={{ color: '#fff' }}>🎯 How to Decouple the Core:</strong>
            <span>1️⃣ Locate the active high-voltage bus line (<strong>Col 1</strong>) across Channels A through F.</span>
            <span>2️⃣ Follow each channel&apos;s <strong>Bus Sequence tag (Seq #1 → #6)</strong> to read the bytes in their proper transmission order.</span>
            <span>3️⃣ Use the <strong>Hexadecimal Decoder Workbench</strong> below to translate the 2-digit hex bytes into ASCII characters (e.g. <code>0x41</code> → <code>&apos;A&apos;</code>).</span>
            <span>4️⃣ Enter the assembled 6-character key fragment into the solution bar below to unlock Stage 6!</span>
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

          {/* Routing Order Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(6, 18, 38, 0.7)',
              border: '1px solid var(--line)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
              📡 BUS PACKET ROUTING SEQUENCE:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="badge badge-gold">Seq #1: Ch B</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span className="badge badge-gold">Seq #2: Ch D</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span className="badge badge-gold">Seq #3: Ch A</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span className="badge badge-gold">Seq #4: Ch F</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span className="badge badge-gold">Seq #5: Ch C</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span className="badge badge-gold">Seq #6: Ch E</span>
            </div>
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
                  <th style={{ padding: '8px 12px', textAlign: 'left', width: '170px' }}>CHANNEL / BUS SEQ</th>
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
                        background: 'rgba(6, 18, 38, 0.6)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{row.channel}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--gold)',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {row.seqLabel || `Seq #${row.seqNumber || rIdx + 1}`}
                        </span>
                      </div>
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
                placeholder="e.g. 5A 4F 37 B1 82 9C"
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

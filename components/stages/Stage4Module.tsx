'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../common/UI';
import { showToast, wsManager, useSignal, teamState } from '@/store';

interface LogRow {
  time: string;
  user: string;
  door: string;
  status: string;
  clearance: string;
}

interface LegendItem {
  shape: string;
  letter: string;
}

const DEFAULT_ACCESS_LOGS: LogRow[] = [
  { time: '08:02', user: 'a.rao', door: 'Lab-1', status: 'GRANTED', clearance: 'L1' },
  { time: '08:07', user: 'm.kumar', door: 'Lab-2', status: 'GRANTED', clearance: 'L4' },
  { time: '08:15', user: 's.nair', door: 'Vault Gate', status: 'GRANTED', clearance: 'L8' },
  { time: '08:21', user: 'r.iyer', door: 'Lab-1', status: 'GRANTED', clearance: 'L5' },
  { time: '08:34', user: 'unknown', door: 'Vault Gate', status: 'DENIED', clearance: 'L9' },
  { time: '08:40', user: 'p.shetty', door: 'Lab-3', status: 'GRANTED', clearance: 'L1' },
  { time: '08:46', user: 'd.gowda', door: 'Lab-2', status: 'GRANTED', clearance: 'L4' },
  { time: '08:53', user: 'k.bhat', door: 'Vault Gate', status: 'GRANTED', clearance: 'L8' },
  { time: '09:01', user: 't.menon', door: 'Lab-1', status: 'GRANTED', clearance: 'L5' },
  { time: '09:10', user: 'v.hegde', door: 'Lab-3', status: 'GRANTED', clearance: 'L1' }
];

const SET_STATION_CONFIG: Record<
  string,
  { s1Clearance: string; activeSymbol: string; legend: LegendItem[] }
> = {
  A: {
    s1Clearance: 'L9',
    activeSymbol: 'triangle',
    legend: [
      { shape: 'triangle', letter: 'X' },
      { shape: 'circle', letter: 'O' },
      { shape: 'square', letter: 'K' },
      { shape: 'star', letter: 'S' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'G' }
    ]
  },
  B: {
    s1Clearance: 'L8',
    activeSymbol: 'star',
    legend: [
      { shape: 'star', letter: 'Z' },
      { shape: 'triangle', letter: 'A' },
      { shape: 'circle', letter: 'B' },
      { shape: 'square', letter: 'C' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'E' }
    ]
  },
  C: {
    s1Clearance: 'L7',
    activeSymbol: 'diamond',
    legend: [
      { shape: 'diamond', letter: 'Y' },
      { shape: 'triangle', letter: 'F' },
      { shape: 'circle', letter: 'G' },
      { shape: 'square', letter: 'H' },
      { shape: 'star', letter: 'I' },
      { shape: 'pentagon', letter: 'J' }
    ]
  },
  D: {
    s1Clearance: 'L6',
    activeSymbol: 'square',
    legend: [
      { shape: 'square', letter: 'K' },
      { shape: 'triangle', letter: 'L' },
      { shape: 'circle', letter: 'M' },
      { shape: 'star', letter: 'N' },
      { shape: 'diamond', letter: 'P' },
      { shape: 'pentagon', letter: 'Q' }
    ]
  },
  E: {
    s1Clearance: 'L5',
    activeSymbol: 'circle',
    legend: [
      { shape: 'circle', letter: 'W' },
      { shape: 'triangle', letter: 'R' },
      { shape: 'square', letter: 'T' },
      { shape: 'star', letter: 'U' },
      { shape: 'diamond', letter: 'V' },
      { shape: 'pentagon', letter: 'Y' }
    ]
  }
};

const ShapeSVG = ({ shape, size = 24, glow = false, color = 'var(--cyan)' }: { shape: string; size?: number; glow?: boolean; color?: string }) => {
  const style = glow
    ? { filter: `drop-shadow(0 0 8px ${color})`, stroke: color, color }
    : { stroke: color, color };

  switch (shape) {
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <polygon points="12,3 22,21 2,21" fill={glow ? 'rgba(39, 180, 255, 0.2)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'pentagon':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
          <polygon points="12,2 22,9 18,21 6,21 2,9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

export const Stage4Module: React.FC = () => {
  const state = useSignal(teamState);
  const assignedSet = (((state as any)?.setId || 'A') as string).toUpperCase();
  const setCfg = SET_STATION_CONFIG[assignedSet] || SET_STATION_CONFIG.A;

  const initialLogs = DEFAULT_ACCESS_LOGS.map((log) =>
    log.user === 'unknown' ? { ...log, clearance: setCfg.s1Clearance } : log
  );

  const [solvedStations, setSolvedStations] = useState<number[]>([]);
  const [logs, setLogs] = useState<LogRow[]>(initialLogs);
  const [legend, setLegend] = useState<LegendItem[]>(setCfg.legend);
  const [activeSymbol, setActiveSymbol] = useState<string>(setCfg.activeSymbol);

  // Sync station configuration whenever team's assigned set updates
  useEffect(() => {
    const cfg = SET_STATION_CONFIG[assignedSet] || SET_STATION_CONFIG.A;
    setLogs(DEFAULT_ACCESS_LOGS.map((log) =>
      log.user === 'unknown' ? { ...log, clearance: cfg.s1Clearance } : log
    ));
    setLegend(cfg.legend);
    setActiveSymbol(cfg.activeSymbol);
  }, [assignedSet]);

  // Input states per station
  const [s1Input, setS1Input] = useState('');
  const [s2Input, setS2Input] = useState('');
  const [s3Input, setS3Input] = useState('');

  // Checking loading states
  const [checking1, setChecking1] = useState(false);
  const [checking2, setChecking2] = useState(false);
  const [checking3, setChecking3] = useState(false);

  // Errors / feedback per station
  const [s1Feedback, setS1Feedback] = useState<string | null>(null);
  const [s2Feedback, setS2Feedback] = useState<string | null>(null);
  const [s3Feedback, setS3Feedback] = useState<string | null>(null);

  // Station 2 Camera Controls
  const [brightness, setBrightness] = useState(1);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Fetch initial stage data
  useEffect(() => {
    let mounted = true;

    async function loadStage4() {
      try {
        const res = await fetch(`/api/stage/4?set=${assignedSet}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data) return;

        if (Array.isArray(data.solvedStations)) {
          setSolvedStations(data.solvedStations);
        }
        if (data.station1 && Array.isArray(data.station1.logs) && data.station1.logs.length > 0) {
          setLogs(data.station1.logs);
        }
        if (data.station3 && Array.isArray(data.station3.legend) && data.station3.legend.length > 0) {
          setLegend(data.station3.legend);
        }
        if (data.station3 && data.station3.activeSymbol) {
          setActiveSymbol(data.station3.activeSymbol);
        }
      } catch (err) {
        console.warn('Stage 4 load warning (using local set data):', err);
      }
    }

    loadStage4();

    const unsubscribe = wsManager.on('stage4:station_solved', (msg: any) => {
      if (Array.isArray(msg.solvedStations)) {
        setSolvedStations(msg.solvedStations);
        showToast(`Station ${msg.station} verified! ✅`, 'ok');
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [assignedSet]);

  async function checkStation(stationNum: number, value: string) {
    if (!value.trim()) return;

    if (stationNum === 1) {
      setChecking1(true);
      setS1Feedback(null);
    } else if (stationNum === 2) {
      setChecking2(true);
      setS2Feedback(null);
    } else if (stationNum === 3) {
      setChecking3(true);
      setS3Feedback(null);
    }

    try {
      const res = await fetch('/api/stage/4/station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: stationNum, value: value.trim() })
      });

      const data = await res.json();

      if (data.ok) {
        setSolvedStations(data.solvedStations || []);
        showToast(`Station ${stationNum} solved! ✅`, 'ok');
      } else {
        const msg = data.message || 'Not quite, look again. 🙂';
        if (stationNum === 1) setS1Feedback(msg);
        if (stationNum === 2) setS2Feedback(msg);
        if (stationNum === 3) setS3Feedback(msg);
      }
    } catch (err: any) {
      const errTxt = err.message || 'Verification error';
      if (stationNum === 1) setS1Feedback(errTxt);
      if (stationNum === 2) setS2Feedback(errTxt);
      if (stationNum === 3) setS3Feedback(errTxt);
    } finally {
      if (stationNum === 1) setChecking1(false);
      if (stationNum === 2) setChecking2(false);
      if (stationNum === 3) setChecking3(false);
    }
  }

  const isS1Solved = solvedStations.includes(1);
  const isS2Solved = solvedStations.includes(2);
  const isS3Solved = solvedStations.includes(3);

  const contrast = 1 + (brightness - 1) * 0.8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Story Card */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🚩</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)', margin: 0 }}>
                  Stage 4: CTF Challenges
                </h3>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)' }}>
                  🛡️ Security Control Room
                </span>
              </div>
            </div>

            {/* Progress Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg2)',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid var(--line)'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                Stations solved: {solvedStations.length}/3
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3].map((num) => {
                  const solved = solvedStations.includes(num);
                  return (
                    <div
                      key={num}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: solved ? 'var(--ok)' : 'var(--bg)',
                        border: `1.5px solid ${solved ? 'var(--ok)' : 'var(--muted)'}`,
                        boxShadow: solved ? '0 0 6px var(--ok)' : 'none',
                        transition: 'background 0.3s, box-shadow 0.3s'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', margin: 0 }}>
            📖 The story: The intruder slipped through the vault gateway! 🚨 Check the 3 security stations, find the hidden character at each one, and join them in order (Station 1 + 2 + 3) to lock the gateway again.
          </p>

          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--cyan)',
              background: 'rgba(39, 180, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '6px'
            }}
          >
            🧑🤝🧑 Tip: split the stations between your teammates and share what you find!
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--gold)',
              paddingTop: '2px'
            }}
          >
            ✍️ When all 3 stations show ✅, join the 3 characters in order and type them below.
          </div>
        </div>
      </Card>

      {/* 2. Three Station Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}
      >
        {/* ================= STATION 1 ================= */}
        <Card
          style={{
            borderColor: isS1Solved ? 'var(--ok)' : 'var(--line)',
            boxShadow: isS1Solved ? '0 0 14px rgba(52, 211, 153, 0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📋</span>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
                    Station 1: Access Log
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Find the intruder</span>
                </div>
              </div>
              <span className={`badge ${isS1Solved ? 'badge-ok' : 'badge-gold'}`}>
                {isS1Solved ? '✅ Solved' : 'Station 1'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '12px' }}>
              Every door entry is GRANTED except one. Read the clearance digit of the suspicious row.
            </p>

            {/* Access Log Table */}
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                overflowX: 'auto',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                marginBottom: '14px'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--cyan)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>User</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Door</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Clearance</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row, idx) => (
                    <tr
                      key={idx}
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: '1px solid rgba(29, 79, 143, 0.2)',
                        background: hoveredRow === idx ? 'rgba(39, 180, 255, 0.1)' : 'transparent',
                        transition: 'background 0.15s',
                        cursor: 'default'
                      }}
                    >
                      <td style={{ padding: '5px 8px', color: 'var(--muted)' }}>{row.time}</td>
                      <td style={{ padding: '5px 8px', color: 'var(--txt)' }}>{row.user}</td>
                      <td style={{ padding: '5px 8px', color: 'var(--txt)' }}>{row.door}</td>
                      <td style={{ padding: '5px 8px', color: 'var(--txt)' }}>{row.status}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--txt)', fontWeight: 700 }}>
                        {row.clearance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Bar */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            {isS1Solved ? (
              <div style={{ color: 'var(--ok)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>Station 1 solved! Character verified.</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={s1Input}
                    onChange={(e) => setS1Input(e.target.value.slice(0, 1))}
                    placeholder="Digit"
                    maxLength={1}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 800, fontSize: '16px' }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => checkStation(1, s1Input)}
                    disabled={checking1 || !s1Input.trim()}
                    style={{ flex: 1 }}
                  >
                    {checking1 ? 'Checking...' : 'Check Station 1'}
                  </Button>
                </div>
                {s1Feedback && (
                  <div style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                    ⚠️ {s1Feedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ================= STATION 2 ================= */}
        <Card
          style={{
            borderColor: isS2Solved ? 'var(--ok)' : 'var(--line)',
            boxShadow: isS2Solved ? '0 0 14px rgba(52, 211, 153, 0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔦</span>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
                    Station 2: Dark Camera Feed
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Light up the footage</span>
                </div>
              </div>
              <span className={`badge ${isS2Solved ? 'badge-ok' : 'badge-gold'}`}>
                {isS2Solved ? '✅ Solved' : 'Station 2'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '10px' }}>
              Camera 4 is almost black. Slide the brightness up to see what is hidden.
            </p>

            {/* Dark Camera Viewer with Scanline */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#08142c',
                border: '1px solid var(--line)',
                marginBottom: '10px',
                aspectRatio: '16/9'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/stage/4/camera.png"
                alt="Camera 4 surveillance feed"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  filter: `brightness(${brightness}) contrast(${contrast})`,
                  transition: 'filter 0.05s linear'
                }}
              />

              {/* Animated Surveillance Scanning Line */}
              <div
                className="camera-scanline"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'rgba(39, 180, 255, 0.5)',
                  boxShadow: '0 0 8px var(--accent)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* Brightness Slider */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                <span>CAMERA BRIGHTNESS</span>
                <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{brightness.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Verification Bar */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            {isS2Solved ? (
              <div style={{ color: 'var(--ok)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>Station 2 solved! Character verified.</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={s2Input}
                    onChange={(e) => setS2Input(e.target.value.slice(0, 1))}
                    placeholder="Digit"
                    maxLength={1}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 800, fontSize: '16px' }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => checkStation(2, s2Input)}
                    disabled={checking2 || !s2Input.trim()}
                    style={{ flex: 1 }}
                  >
                    {checking2 ? 'Checking...' : 'Check Station 2'}
                  </Button>
                </div>
                {s2Feedback && (
                  <div style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                    ⚠️ {s2Feedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* ================= STATION 3 ================= */}
        <Card
          style={{
            borderColor: isS3Solved ? 'var(--ok)' : 'var(--line)',
            boxShadow: isS3Solved ? '0 0 14px rgba(52, 211, 153, 0.15)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔣</span>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--txt)' }}>
                    Station 3: Symbol Keypad
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Read the symbol</span>
                </div>
              </div>
              <span className={`badge ${isS3Solved ? 'badge-ok' : 'badge-gold'}`}>
                {isS3Solved ? '✅ Solved' : 'Station 3'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '10px' }}>
              Use the legend to turn the symbol on the keypad into a letter.
            </p>

            {/* Glowing Keypad Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(6, 18, 38, 0.8)',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                marginBottom: '10px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>
                  ACTIVE KEYPAD SYMBOL
                </div>
                <div style={{ display: 'inline-block', animation: 'pulse 2s infinite' }}>
                  <ShapeSVG shape={activeSymbol} size={54} glow color="var(--accent)" />
                </div>
              </div>
            </div>

            {/* SVG Symbol Legend Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '12px'
              }}
            >
              {legend.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px',
                    background: 'var(--bg)',
                    borderRadius: '6px',
                    border: '1px solid rgba(29, 79, 143, 0.3)'
                  }}
                >
                  <ShapeSVG shape={item.shape} size={18} color="var(--cyan)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--gold)', fontSize: '13px' }}>
                    = {item.letter}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Bar */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            {isS3Solved ? (
              <div style={{ color: 'var(--ok)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>Station 3 solved! Character verified.</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={s3Input}
                    onChange={(e) => setS3Input(e.target.value.slice(0, 1).toUpperCase())}
                    placeholder="Letter"
                    maxLength={1}
                    style={{ width: '80px', textAlign: 'center', fontWeight: 800, fontSize: '16px' }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => checkStation(3, s3Input)}
                    disabled={checking3 || !s3Input.trim()}
                    style={{ flex: 1 }}
                  >
                    {checking3 ? 'Checking...' : 'Check Station 3'}
                  </Button>
                </div>
                {s3Feedback && (
                  <div style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                    ⚠️ {s3Feedback}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Synthesis & Combined Key Card */}
      <Card glow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>
              🔑 Gateway Override Key Synthesis
            </span>
            <span className={`badge ${solvedStations.length === 3 ? 'badge-green' : 'badge-gold'}`}>
              {solvedStations.length === 3 ? 'Ready to Submit ✅' : `${solvedStations.length}/3 Stations Verified`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', background: 'var(--bg2)', borderRadius: '6px', border: '1px solid var(--line)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>STATION 1</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)' }}>{s1Input || (isS1Solved ? '✓' : '?')}</div>
            </div>
            <span style={{ color: 'var(--muted)', fontWeight: 800 }}>+</span>
            <div style={{ padding: '8px 14px', background: 'var(--bg2)', borderRadius: '6px', border: '1px solid var(--line)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>STATION 2</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)' }}>{s2Input || (isS2Solved ? '✓' : '?')}</div>
            </div>
            <span style={{ color: 'var(--muted)', fontWeight: 800 }}>+</span>
            <div style={{ padding: '8px 14px', background: 'var(--bg2)', borderRadius: '6px', border: '1px solid var(--line)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>STATION 3</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)' }}>{s3Input || (isS3Solved ? '✓' : '?')}</div>
            </div>
            <span style={{ color: 'var(--gold)', fontWeight: 800 }}>=</span>
            <div style={{ padding: '8px 16px', background: 'rgba(255, 184, 31, 0.1)', borderRadius: '6px', border: '1px solid var(--gold)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold)' }}>COMBINED KEY</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold-bright)', letterSpacing: '2px' }}>
                {s1Input && s2Input && s3Input ? `${s1Input}${s2Input}${s3Input}` : '3 Characters'}
              </div>
            </div>
            {s1Input && s2Input && s3Input && (
              <Button
                variant="gold"
                onClick={() => {
                  const combined = `${s1Input}${s2Input}${s3Input}`.trim().toUpperCase();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fo:set-answer', { detail: combined }));
                  }
                  showToast(`Filled "${combined}" into solution bar!`, 'ok');
                }}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
              >
                Fill into Solution Bar ➡️
              </Button>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
            💡 Combine the 3 verified characters in order (Station 1 + Station 2 + Station 3) and submit in the solution bar below to override Mission 4.
          </p>
        </div>
      </Card>
    </div>
  );
};

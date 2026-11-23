import { FunctionalComponent } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { Button, Card } from '../common/UI';
import { teamState, showToast } from '../../store';

interface Stage1Data {
  stage: number;
  name: string;
  heading: string;
  story: string;
  footerLine: string;
  timing: {
    unit: number;
    dot: number;
    dash: number;
    gap: number;
    leadIn: number;
  };
  sectors: any[];
  pad: { s1: string; s2: string; s3: string; s4: string };
}

// 15-character International Morse Chart (Hint 1)
const MORSE_CHART_15 = [
  { char: 'A', code: '•—' },
  { char: 'B', code: '—•••' },
  { char: 'C', code: '—•—•' },
  { char: 'D', code: '—••' },
  { char: 'E', code: '•' },
  { char: 'F', code: '••—•' },
  { char: 'G', code: '——•' },
  { char: 'H', code: '••••' },
  { char: 'I', code: '••' },
  { char: 'J', code: '•———' },
  { char: 'K', code: '—•—' },
  { char: 'L', code: '•—••' },
  { char: 'M', code: '——' },
  { char: 'N', code: '—•' },
  { char: 'O', code: '———' },
  { char: 'R', code: '•—•' },
  { char: 'S', code: '•••' },
  { char: 'U', code: '••—' },
  { char: 'V', code: '•••—' },
  { char: 'Z', code: '——••' }
];

const SET_STAGE1_DATA: Record<string, {
  s1Pattern: string[];
  s2Pattern: string[];
  s2Telemetry: string;
  s2Visual: string;
  s3Pattern: string[];
  s4Pattern: string[];
}> = {
  A: {
    s1Pattern: ['—', '•'],
    s2Pattern: ['—', '—', '—'],
    s2Telemetry: '111-111-111',
    s2Visual: '━━━   ━━━   ━━━',
    s3Pattern: ['•', '•', '•', '—'],
    s4Pattern: ['•', '—']
  },
  B: {
    s1Pattern: ['•', '—', '•', '•'],
    s2Pattern: ['•', '•', '—'],
    s2Telemetry: '1-1-111',
    s2Visual: '•   •   ━━━',
    s3Pattern: ['—', '•'],
    s4Pattern: ['•', '—']
  },
  C: {
    s1Pattern: ['•', '•', '•', '—'],
    s2Pattern: ['•'],
    s2Telemetry: '1',
    s2Visual: '•',
    s3Pattern: ['—', '—', '•'],
    s4Pattern: ['•', '—']
  },
  D: {
    s1Pattern: ['—', '—'],
    s2Pattern: ['•', '—'],
    s2Telemetry: '1-111',
    s2Visual: '•   ━━━',
    s3Pattern: ['•', '—', '•'],
    s4Pattern: ['•', '•', '•']
  },
  E: {
    s1Pattern: ['•'],
    s2Pattern: ['—', '•', '—', '•'],
    s2Telemetry: '111-1-111-1',
    s2Visual: '━━━   •   ━━━   •',
    s3Pattern: ['•', '•', '•', '•'],
    s4Pattern: ['—', '—', '—']
  }
};

export const Stage1Module: FunctionalComponent = () => {
  const state = teamState.value;
  const assignedSet = ((state as any)?.setId || 'A').toUpperCase();
  const currentSetData = SET_STAGE1_DATA[assignedSet] || SET_STAGE1_DATA.A;

  // Master Sound State
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<{ [key: string]: AudioBuffer }>({});
  const currentSourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  // Active playing sector: null | 1 | 2 | 3 | 4
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [activeSignalIndex, setActiveSignalIndex] = useState<number>(-1);

  // Sector 2 Freeze toggle
  const [feedFrozen, setFeedFrozen] = useState(false);

  // Sector 3 Loop toggle
  const [strobeLoop, setStrobeLoop] = useState(false);
  const strobeLoopRef = useRef(false);
  strobeLoopRef.current = strobeLoop;

  // Decoy banner visibility
  const [showDecoy, setShowDecoy] = useState(false);

  // Decode Pad State
  const [pad, setPad] = useState<{ s1: string; s2: string; s3: string; s4: string }>({
    s1: '',
    s2: '',
    s3: '',
    s4: ''
  });
  const padTimerRef = useRef<any>(null);

  // Canvas Refs
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const satCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Timing constants (in seconds)
  const UNIT = 0.22;
  const LEAD_IN = 0.2;

  // Initialize AudioContext
  function getAudioContext() {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  // Preload audio files
  useEffect(() => {
    async function loadAudio(url: string, key: string) {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuf = await res.arrayBuffer();
        const ctx = getAudioContext();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        audioBuffersRef.current[key] = audioBuf;
      } catch (err) {
        console.warn(`Fallback to synth for ${key}:`, err);
      }
    }

    loadAudio('/api/stage/1/assets/sector1_oscilloscope_N.mp3', 'sec1');
    loadAudio('/api/stage/1/assets/sector4_satellite_A.mp3', 'sec4');

    // Fetch initial pad
    fetch('/api/stage/1/pad')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.pad) setPad(data.pad);
      })
      .catch(() => {});

    // Decoy Trap: Flashes for 1.2s every 6s
    const decoyInterval = setInterval(() => {
      setShowDecoy(true);
      setTimeout(() => setShowDecoy(false), 1200);
    }, 6000);

    // IntersectionObserver to pause animations when off screen
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    });

    if (oscCanvasRef.current) observer.observe(oscCanvasRef.current);

    return () => {
      clearInterval(decoyInterval);
      observer.disconnect();
      stopCurrentAudio();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Stop currently playing audio
  function stopCurrentAudio() {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    setActiveSector(null);
    setActiveSignalIndex(-1);
  }

  // Synthesize Morse Pattern using Oscillator Fallback (700Hz sine, 4ms fade)
  function playSynthPattern(pattern: string[], onEnd?: () => void) {
    const ctx = getAudioContext();
    const now = ctx.currentTime + LEAD_IN;
    let curTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 700;

    gain.gain.setValueAtTime(0, ctx.currentTime);

    for (let i = 0; i < pattern.length; i++) {
      const sym = pattern[i];
      const dur = sym === '—' ? 3 * UNIT : 1 * UNIT;
      const start = curTime;
      const end = curTime + dur;

      // 4ms ramp up
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.8, start + 0.004);
      // 4ms ramp down
      gain.gain.setValueAtTime(volume * 0.8, end - 0.004);
      gain.gain.linearRampToValueAtTime(0, end);

      curTime += dur;
      if (i < pattern.length - 1) {
        curTime += 1 * UNIT; // gap
      }
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(curTime + 0.1);

    currentSourceRef.current = osc;

    osc.onended = () => {
      currentSourceRef.current = null;
      if (onEnd) onEnd();
    };
  }

  // Play Sector 1 (Oscilloscope)
  function handlePlaySector1() {
    stopCurrentAudio();
    setActiveSector(1);
    setSoundEnabled(true);

    const ctx = getAudioContext();
    const buf = assignedSet === 'A' ? audioBuffersRef.current['sec1'] : null;

    // Visual timeline simulation
    runVisualMorseTimeline(currentSetData.s1Pattern, 1);

    if (buf) {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime + LEAD_IN);
      currentSourceRef.current = src;
      src.onended = () => {
        currentSourceRef.current = null;
        setActiveSector(null);
      };
    } else {
      playSynthPattern(currentSetData.s1Pattern, () => setActiveSector(null));
    }
  }

  // Play Sector 3 (Optical Strobe Beacon)
  function handlePlaySector3() {
    stopCurrentAudio();
    setActiveSector(3);
    runVisualMorseTimeline(currentSetData.s3Pattern, 3, () => {
      if (strobeLoopRef.current) {
        setTimeout(handlePlaySector3, 500);
      } else {
        setActiveSector(null);
      }
    });
  }

  // Play Sector 4 (Satellite Relay)
  function handlePlaySector4() {
    stopCurrentAudio();
    setActiveSector(4);
    setSoundEnabled(true);

    const ctx = getAudioContext();
    const buf = assignedSet === 'A' ? audioBuffersRef.current['sec4'] : null;

    runVisualMorseTimeline(currentSetData.s4Pattern, 4);

    if (buf) {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime + LEAD_IN);
      currentSourceRef.current = src;
      src.onended = () => {
        currentSourceRef.current = null;
        setActiveSector(null);
      };
    } else {
      playSynthPattern(currentSetData.s4Pattern, () => setActiveSector(null));
    }
  }

  // Synchronized Visual Morse Timeline
  function runVisualMorseTimeline(pattern: string[], sectorId: number, onComplete?: () => void) {
    let offsetMs = LEAD_IN * 1000;

    pattern.forEach((sym, idx) => {
      const durMs = (sym === '—' ? 3 * UNIT : 1 * UNIT) * 1000;
      setTimeout(() => {
        setActiveSignalIndex(idx);
      }, offsetMs);

      offsetMs += durMs;
      setTimeout(() => {
        setActiveSignalIndex(-1);
      }, offsetMs);

      offsetMs += 1 * UNIT * 1000; // gap
    });

    setTimeout(() => {
      if (onComplete) onComplete();
      else setActiveSector(null);
    }, offsetMs);
  }

  // Canvas Oscilloscope Animation (Sector 1)
  useEffect(() => {
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    function renderOsc() {
      if (!canvas || !ctx || !isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(renderOsc);
        return;
      }

      ctx.fillStyle = '#061226';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(29, 79, 143, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Phosphor Waveform
      const isHigh = activeSector === 1 && activeSignalIndex !== -1;
      const amplitude = isHigh ? 30 : 6;
      ctx.strokeStyle = isHigh ? '#34d399' : '#27b4ff';
      ctx.shadowColor = isHigh ? 'rgba(52, 211, 153, 0.8)' : 'rgba(39, 180, 255, 0.4)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const freq = isHigh ? 0.08 : 0.04;
        const y = canvas.height / 2 + Math.sin(x * freq + phase) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      phase += isHigh ? 0.2 : 0.05;
      animFrameRef.current = requestAnimationFrame(renderOsc);
    }

    renderOsc();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeSector, activeSignalIndex]);

  // Decode Pad Change & Debounced Team Sync
  function handlePadInput(key: 's1' | 's2' | 's3' | 's4', val: string) {
    const clean = val.toUpperCase().slice(0, 1);
    const newPad = { ...pad, [key]: clean };
    setPad(newPad);

    if (padTimerRef.current) clearTimeout(padTimerRef.current);
    padTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/stage/1/pad', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pad: newPad })
        });
      } catch (err) {}
    }, 400);
  }

  // Check if Hint 1 is currently active (to display Morse Chart)
  const isHint1Active =
    state?.hintsUsed?.[1]?.[1]?.text &&
    state.hintsUsed[1][1].expiresAt &&
    state.hintsUsed[1][1].expiresAt > Date.now();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Decoy Anomaly Banner */}
      <div
        aria-hidden="true"
        style={{
          background: showDecoy ? 'rgba(255, 93, 108, 0.95)' : 'transparent',
          color: showDecoy ? '#fff' : 'transparent',
          border: `1px solid ${showDecoy ? 'var(--bad)' : 'transparent'}`,
          borderRadius: 'var(--r-sm)',
          padding: '8px 16px',
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '1px',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          pointerEvents: 'none'
        }}
      >
        {showDecoy && '⚠️ ANOMALY DETECTED: FREQ-ZETA9 · DECOY SIGNAL'}
      </div>

      {/* Stage Header Story & Master Audio Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <p style={{ color: 'var(--txt)', fontSize: '14px', lineHeight: 1.5 }}>
            📖 The story: Your squad has intercepted 4 sectors of the vault’s communication grid! 📡
            Each sector hides one letter in Morse code (• = short, — = long). Decode them in order,
            Sector 1 to 4, to reveal the secret cosmic word.
          </p>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--cyan)',
              fontWeight: 600,
              marginTop: '6px'
            }}
          >
            ✍️ Write the 4 letters in order (Sector 1 → 4) as one word, then type it below and press
            Submit.
          </div>
        </div>

        {/* Master Sound On / Off & Volume Slider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg2)',
            padding: '8px 14px',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--line)'
          }}
        >
          <button
            onClick={() => {
              const ctx = getAudioContext();
              setSoundEnabled(!soundEnabled);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: soundEnabled ? 'var(--ok)' : 'var(--muted)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{soundEnabled ? '🔊 Sound On' : '🔇 Sound Muted'}</span>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e: any) => setVolume(parseFloat(e.target.value))}
            style={{ width: '64px', accentColor: 'var(--accent)' }}
            title="Master Audio Volume"
          />
        </div>
      </div>

      {/* Decode Pad (4 small boxes labelled S1 to S4) */}
      <div
        style={{
          background: 'rgba(6, 18, 38, 0.8)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>
            📋 SQUAD DECODE PAD
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Personal notepad boxes · Synced across squad devices
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['s1', 's2', 's3', 's4'] as const).map((k, idx) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--cyan)', marginBottom: '2px', fontWeight: 700 }}>
                S{idx + 1}
              </div>
              <input
                type="text"
                value={pad[k]}
                onInput={(e: any) => handlePadInput(k, e.target.value)}
                maxLength={1}
                placeholder="?"
                style={{
                  width: '36px',
                  height: '36px',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  border: `1px solid ${pad[k] ? 'var(--accent)' : 'var(--line)'}`,
                  color: 'var(--txt)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '16px',
                  fontWeight: 800,
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hint 1: International Morse Chart (Visible during 30s Hint window) */}
      {isHint1Active && (
        <div
          style={{
            background: 'rgba(39, 180, 255, 0.08)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--r-sm)',
            padding: '16px',
            animation: 'modalPop 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cyan)' }}>
              💡 HINT 1 TACTICAL AID: 15-CHARACTER INTERNATIONAL MORSE CHART
            </span>
            <span className="badge badge-gold">Auto-locks in 30s</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px'
            }}
          >
            {MORSE_CHART_15.map((m) => (
              <div
                key={m.char}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: 'var(--bg2)',
                  borderRadius: '4px',
                  border: '1px solid var(--line)'
                }}
              >
                <strong style={{ color: 'var(--gold)' }}>{m.char}</strong>
                <span style={{ color: 'var(--txt)' }}>{m.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Four Sectors Grid (Stacked on mobile, 2x2 on desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* SECTOR 1: Oscilloscope / Pulse Graph */}
        <Card
          className={activeSector === 1 ? 'chamfered-card-glow' : ''}
          style={{
            border: activeSector === 1 ? '1px solid var(--ok)' : '1px solid var(--line)',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>SECTOR 1</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Oscilloscope</span>
            </div>
            {activeSector === 1 && <span className="badge badge-ok">PLAYING</span>}
          </div>

          {/* Canvas Waveform Display */}
          <canvas
            ref={oscCanvasRef}
            width={300}
            height={80}
            style={{
              width: '100%',
              height: '80px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              display: 'block',
              background: '#061226'
            }}
          />

          <div style={{ marginTop: '10px' }}>
            <Button
              variant="primary"
              onClick={handlePlaySector1}
              style={{ width: '100%', padding: '8px', fontSize: '12px' }}
            >
              ▶ Play pulses (Audio + Trace)
            </Button>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '6px' }}>
              Short = • &nbsp;&nbsp; Long = —
            </div>
          </div>
        </Card>

        {/* SECTOR 2: Binary Telemetry Feed */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>SECTOR 2</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Binary Telemetry</span>
            </div>
            <button
              onClick={() => setFeedFrozen(!feedFrozen)}
              style={{
                background: 'none',
                border: '1px solid var(--line)',
                color: feedFrozen ? 'var(--gold)' : 'var(--muted)',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {feedFrozen ? '▶ Resume feed' : '⏸ Freeze feed'}
            </button>
          </div>

          {/* Scrolling Monospace Binary Feed with Highlighted Blocks */}
          <div
            style={{
              height: '80px',
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div style={{ opacity: 0.5 }}>01001000 01100101 01111000</div>
            <div style={{ color: 'var(--gold)', fontWeight: 800, background: 'rgba(255, 184, 31, 0.15)', padding: '2px 4px', borderRadius: '4px' }}>
              HIGH-STATES: [ {currentSetData.s2Telemetry} ]
            </div>
            <div style={{ opacity: 0.5 }}>01101111 01110010 01100010</div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                padding: '6px',
                background: 'rgba(39, 180, 255, 0.05)',
                borderRadius: '6px',
                border: '1px dashed var(--line)'
              }}
            >
              <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px' }}>
                {currentSetData.s2Visual}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '6px' }}>
              Short = • &nbsp;&nbsp; Long = —
            </div>
          </div>
        </Card>

        {/* SECTOR 3: Optical Strobe Beacon */}
        <Card
          className={activeSector === 3 ? 'chamfered-card-glow' : ''}
          style={{
            border: activeSector === 3 ? '1px solid var(--amber)' : '1px solid var(--line)',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>SECTOR 3</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Optical Beacon</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={strobeLoop}
                onChange={(e: any) => setStrobeLoop(e.target.checked)}
                style={{ accentColor: 'var(--gold)' }}
              />
              Loop
            </label>
          </div>

          {/* Strobe Amber Lamp with Radial Glow */}
          <div
            style={{
              height: '80px',
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background:
                  activeSector === 3 && activeSignalIndex !== -1
                    ? 'radial-gradient(circle, #fff3b0 20%, #ffb81f 60%, #ff8a00 100%)'
                    : '#1a1a24',
                border: '2px solid rgba(255, 184, 31, 0.5)',
                boxShadow:
                  activeSector === 3 && activeSignalIndex !== -1
                    ? '0 0 32px rgba(255, 184, 31, 1), 0 0 60px rgba(255, 138, 0, 0.6)'
                    : 'none',
                transition: 'all 0.08s ease'
              }}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <Button
              variant="gold"
              onClick={handlePlaySector3}
              style={{ width: '100%', padding: '8px', fontSize: '12px' }}
            >
              ▶ Watch beacon
            </Button>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '6px' }}>
              Short = • &nbsp;&nbsp; Long = —
            </div>
          </div>
        </Card>

        {/* SECTOR 4: Satellite Relay Feed */}
        <Card
          className={activeSector === 4 ? 'chamfered-card-glow' : ''}
          style={{
            border: activeSector === 4 ? '1px solid var(--accent)' : '1px solid var(--line)',
            transition: 'border-color 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>SECTOR 4</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Satellite Relay</span>
            </div>
            {activeSector === 4 && <span className="badge badge-blue">TRANSMITTING</span>}
          </div>

          {/* Visual Spectrogram Spectacle */}
          <div
            style={{
              height: '80px',
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {[14, 28, 42, 56, 38, 22, 48, 64, 32, 18].map((h, i) => {
              const active = activeSector === 4 && activeSignalIndex !== -1;
              const barHeight = active ? Math.min(60, h * 1.2) : h * 0.4;
              return (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: `${barHeight}px`,
                    background: active ? 'var(--cyan)' : 'var(--line)',
                    borderRadius: '2px',
                    transition: 'height 0.1s ease, background 0.1s ease'
                  }}
                />
              );
            })}
          </div>

          <div style={{ marginTop: '10px' }}>
            <Button
              variant="primary"
              onClick={handlePlaySector4}
              style={{ width: '100%', padding: '8px', fontSize: '12px' }}
            >
              ▶ Play carrier
            </Button>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '6px' }}>
              Short = • &nbsp;&nbsp; Long = —
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, Button, Input } from '@/components/common/UI';
import { teamState, showToast, wsManager } from '@/store';

const OFFICIAL_TEAMS = [
  { num: 1, name: 'Trinetra', set: 'A' },
  { num: 2, name: 'Bug Busters', set: 'A' },
  { num: 3, name: 'TRIO_BYTE', set: 'A' },
  { num: 4, name: 'Team Bhai', set: 'A' },
  { num: 5, name: 'Cipher', set: 'A' },
  { num: 6, name: 'Team Jupiter', set: 'A' },
  { num: 7, name: 'Aèsir’s', set: 'B' },
  { num: 8, name: 'Team onestop', set: 'B' },
  { num: 9, name: 'Awake', set: 'B' },
  { num: 10, name: 'Init', set: 'B' },
  { num: 11, name: 'Syntax Andhre?', set: 'B' },
  { num: 12, name: 'FAB-4', set: 'B' },
  { num: 13, name: 'The Dynamos', set: 'C' },
  { num: 14, name: 'CodeX', set: 'C' },
  { num: 15, name: 'A³', set: 'C' },
  { num: 16, name: 'Huntrix', set: 'C' },
  { num: 17, name: 'Nexora', set: 'C' },
  { num: 18, name: 'Tech titans', set: 'C' },
  { num: 19, name: 'The Cosmos', set: 'D' },
  { num: 20, name: 'THIRD EYE', set: 'D' },
  { num: 21, name: 'Lap legends', set: 'D' },
  { num: 22, name: 'Upside Downers', set: 'D' },
  { num: 23, name: 'beginners', set: 'D' }
];

function detectAssignedTeam(input: string) {
  const clean = (input || '').trim();
  if (!clean) return null;
  const numMatch = clean.match(/^(?:team\s*[-_#]?\s*)?0*(\d{1,2})$/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const found = OFFICIAL_TEAMS.find((t) => t.num === num);
    if (found) return found;
  }
  const cleanLower = clean.toLowerCase();
  const direct = OFFICIAL_TEAMS.find((t) => t.name.toLowerCase() === cleanLower);
  if (direct) return direct;
  const norm = cleanLower.replace(/[^a-z0-9]/g, '');
  const fuzzy = OFFICIAL_TEAMS.find(
    (t) =>
      t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm ||
      `team${t.num}` === norm ||
      String(t.num) === norm ||
      t.name.toLowerCase().includes(cleanLower) ||
      cleanLower.includes(t.name.toLowerCase())
  );
  return fuzzy || null;
}

export default function LandingPage() {
  const router = useRouter();

  // Mode: 'register' | 'resume'
  const [mode, setMode] = useState<'register' | 'resume'>('register');

  // Register Form State
  const [teamName, setTeamName] = useState('');
  const [coordinator, setCoordinator] = useState('Akul P Yadav');
  const [member1, setMember1] = useState('');
  const [member2, setMember2] = useState('');
  const [member3, setMember3] = useState('');
  const [member4, setMember4] = useState('');
  const [showMember4, setShowMember4] = useState(false);
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resume Form State
  const [resumeTeamName, setResumeTeamName] = useState('');
  const [resumeMemberName, setResumeMemberName] = useState('');
  const [resumeError, setResumeError] = useState('');

  const coordinators = [
    'Akul P Yadav',
    'Gagan S Urs',
    'M Punya Sagar',
    'MN Shashank',
    'Dhanush KP',
    'Anirudh m',
    'Anish S Kumar',
    'Ayush P',
    'Skanda',
    'Vishnuvardhan',
    'Vandhana V',
    'Abhiram BS',
    'Harshil'
  ];

  // 6 Stages definition matching Reference Poster 1
  const stagesList = [
    {
      num: 1,
      title: 'SIGNAL INTERCEPT',
      theme: 'cyan',
      icon: '📡',
      desc: 'Decode hidden Morse signals from sound, light & telemetry'
    },
    {
      num: 2,
      title: 'DECODING',
      theme: 'gold',
      icon: '🔓',
      desc: 'Peel nested cipher layers with the cryptanalyst workbench'
    },
    {
      num: 3,
      title: 'PROMPT THE AI',
      theme: 'cyan',
      icon: '🤖',
      desc: 'Craft precise prompts to bypass WARDEN AI guardian'
    },
    {
      num: 4,
      title: 'CTF CHALLENGES',
      theme: 'gold',
      icon: '🚩',
      desc: 'Inspect security stations to extract gateway flags'
    },
    {
      num: 5,
      title: 'HEX MEMORY CORE',
      theme: 'cyan',
      icon: '💾',
      desc: 'Decouple 6x4 memory channels and calculate parity'
    },
    {
      num: 6,
      title: 'FINAL INTEGRATION',
      theme: 'gold',
      icon: '🧩',
      desc: 'Synthesize all 5 fragments & deploy override vector'
    }
  ];

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');

    let cleanTeam = teamName.trim();
    const listMatch = cleanTeam.match(/^Team\s*(\d{1,2}):\s*(.*)$/i);
    if (listMatch) {
      cleanTeam = listMatch[2].trim() || `Team ${listMatch[1]}`;
    }
    if (!cleanTeam) {
      setRegError('Please provide a squad name.');
      return;
    }
    if (cleanTeam.length > 24) {
      setRegError('Squad name cannot exceed 24 characters.');
      return;
    }

    const members = [member1.trim(), member2.trim(), member3.trim()];
    if (showMember4 && member4.trim()) {
      members.push(member4.trim());
    }

    if (members.some((m) => !m || m.length < 2)) {
      setRegError('All 3 required member names must have at least 2 characters.');
      return;
    }

    // Check unique names
    const set = new Set(members.map((m) => m.toLowerCase()));
    if (set.size !== members.length) {
      setRegError('All squad member names must be distinct.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: cleanTeam,
          coordinator,
          members
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Failed to register squad.');
        setIsSubmitting(false);
        return;
      }

      teamState.value = data.state;
      if (data.token) wsManager.sendAuth(data.token);
      showToast('🚀 Squad Registered! Entering Arena...', 'gold');
      router.push('/play');
    } catch (err: any) {
      setRegError(err.message || 'Network error.');
      setIsSubmitting(false);
    }
  }

  async function handleResume(e: React.FormEvent) {
    e.preventDefault();
    setResumeError('');

    if (!resumeTeamName.trim() || !resumeMemberName.trim()) {
      setResumeError('Please enter both your squad name and your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: resumeTeamName.trim(),
          memberName: resumeMemberName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setResumeError(data.error || 'Failed to resume mission.');
        setIsSubmitting(false);
        return;
      }

      teamState.value = data.state;
      if (data.token) wsManager.sendAuth(data.token);
      showToast('🔄 Device Reconnected! Resuming...', 'ok');
      router.push('/play');
    } catch (err: any) {
      setResumeError(err.message || 'Network error.');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1080px', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
        {/* Mission Overview Banner (from Reference Poster 1) */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p
            style={{
              fontSize: 'clamp(14px, 2.2vw, 17px)',
              color: '#ffffff',
              maxWidth: '820px',
              margin: '0 auto',
              lineHeight: 1.6,
              fontFamily: 'var(--font-hud)',
              fontWeight: 600
            }}
          >
            Your squad solves 6 locked technical puzzles in order (signal clues, decoding, AI prompting, CTF flags, hex core &amp; final merge).
            <span style={{ color: 'var(--gold)', fontWeight: 800, marginLeft: '6px' }}>
              The fastest squad that completes everything correctly wins! 🏆
            </span>
          </p>
        </div>

        {/* &quot;THE 6 STAGES&quot; Visual Cards Track (Matching Reference Poster 1) */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 900,
                color: 'var(--accent)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(0, 240, 255, 0.5)'
              }}
            >
              THE 6 STAGES
            </h2>
          </div>

          <div className="poster-stages-track">
            {stagesList.map((stage) => (
              <div key={stage.num} className={`poster-stage-node ${stage.theme}`}>
                <div className={`poster-stage-pill ${stage.theme}`}>
                  {stage.num}
                </div>
                <div style={{ fontSize: '26px', marginBottom: '6px' }}>
                  {stage.icon}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-hud)',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: stage.theme === 'cyan' ? 'var(--cyan)' : 'var(--gold)',
                    letterSpacing: '0.8px',
                    lineHeight: 1.2,
                    marginBottom: '6px'
                  }}
                >
                  {stage.title}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Exciting Prizes & Goodies Banner (from Reference Poster 1) */}
        <div className="poster-rewards-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(14px, 2.5vw, 18px)',
                  fontWeight: 900,
                  color: 'var(--gold-bright)',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.4)'
                }}
              >
                EXCITING PRIZES &amp; GOODIES
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600, letterSpacing: '0.8px' }}>
                REWARD UNLOCKED · FOR THE WINNING SQUAD
              </div>
            </div>
          </div>
          <span style={{ fontSize: '28px' }}>🎁</span>
        </div>

        {/* Quick Highlights Row (from Reference Poster 1) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px 24px',
            margin: '22px 0 28px'
          }}
        >
          <div className="poster-fastest-ribbon">
            <span>👑</span>
            <span>FASTEST TEAM WINS!</span>
          </div>

          <div
            style={{
              background: 'rgba(6, 18, 38, 0.9)',
              border: '1.5px solid var(--accent)',
              borderRadius: 'var(--r-sm)',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-hud)',
              fontSize: '14px',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.25)'
            }}
          >
            <span>👥</span>
            <span>TEAM SIZE: 3-4 PARTICIPANTS</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 184, 31, 0.12)',
              border: '1.5px solid var(--gold)',
              borderRadius: 'var(--r-sm)',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-hud)',
              fontSize: '14px',
              fontWeight: 900,
              color: 'var(--gold)',
              boxShadow: '0 0 12px rgba(255, 184, 31, 0.25)'
            }}
          >
            <span>⚡</span>
            <span>REGISTRATION FREE</span>
          </div>
        </div>

        {/* Story & Rules Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          {/* Story Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '22px' }}>📖</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-hud)', letterSpacing: '0.5px' }}>
                MISSION BRIEFING
              </h3>
            </div>
            <p style={{ color: 'var(--txt)', fontSize: '14px', lineHeight: 1.6 }}>
              Welcome, Agents! 🕵️ The central vault of Invictors Lab has triggered lockdown protocol, and the autonomous
              guardian AI is withholding the override key. Your squad has been deployed to recover 5 cryptographic fragments 🧩
              across 5 sectors, then synthesize them in the quantum core to execute <strong>FINAL OVERRIDE</strong>. 🔐
            </p>
          </Card>

          {/* Rules & Anti-Cheat Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '22px' }}>🛡️</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-hud)', letterSpacing: '0.5px' }}>
                ENGAGEMENT PROTOCOLS
              </h3>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--txt)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>
              <li>🚪 <strong>Sequential Flow:</strong> Solve missions one by one in order</li>
              <li>🧩 <strong>Fragment Extraction:</strong> Each mission yields 1 secret piece</li>
              <li>💡 <strong>Tactical Hints:</strong> Hint 1 (+3m penalty), Hint 2 (+5m penalty)</li>
              <li>🎯 <strong>Error Allowance:</strong> 5 free attempts per stage, then +1m each</li>
              <li>⚠️ <strong>Anti-Cheat:</strong> Tab switching triggers +2 min penalty per violation</li>
              <li>⏰ <strong>Hard Time Cap:</strong> 90 minutes (5,400s) authoritative timer</li>
              <li>🤝 <strong>Squad Cooperation:</strong> Synchronized live state across teammates</li>
            </ul>
          </Card>
        </div>

        {/* Squad Registration & Resume Card */}
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Card glow>
            {/* Mode Switch Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(4, 11, 24, 0.95)',
                borderRadius: '8px',
                padding: '4px',
                marginBottom: '20px',
                border: '1px solid var(--line-bright)'
              }}
            >
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: mode === 'register' ? 'var(--accent)' : 'transparent',
                  color: mode === 'register' ? '#030712' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🚀 Register New Squad
              </button>
              <button
                type="button"
                onClick={() => setMode('resume')}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: mode === 'resume' ? 'var(--accent)' : 'transparent',
                  color: mode === 'resume' ? '#030712' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🔄 Resume Existing Squad
              </button>
            </div>

            {mode === 'register' ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-hud)', color: 'var(--cyan)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    SQUAD CALLSIGN / TEAM NAME (Max 24 chars) *
                  </label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Team 1, Team 15, CodeX, Trinetra"
                    maxLength={24}
                    list="official-teams-list"
                    autoFocus
                  />
                  <datalist id="official-teams-list">
                    {OFFICIAL_TEAMS.map((t) => (
                      <option key={t.num} value={`Team ${t.num}: ${t.name}`}>
                        Set {t.set} — {t.name}
                      </option>
                    ))}
                  </datalist>
                  {(() => {
                    const detected = detectAssignedTeam(teamName);
                    if (!detected) return null;
                    return (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(39, 180, 255, 0.12)',
                          border: '1px solid var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px'
                        }}
                      >
                        <span style={{ color: 'var(--txt)', fontWeight: 700 }}>
                          🎯 Identified: Team {String(detected.num).padStart(2, '0')} — <strong style={{ color: 'var(--gold)' }}>{detected.name}</strong>
                        </span>
                        <span className="badge badge-gold">
                          Assigned Challenge Set {detected.set}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-hud)', color: 'var(--cyan)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    ASSIGNED COORDINATOR *
                  </label>
                  <select
                    value={coordinator}
                    onChange={(e) => setCoordinator(e.target.value)}
                    className="select"
                  >
                    {coordinators.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--font-hud)', color: 'var(--gold)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    SQUAD ROSTER (3 to 4 Members Required)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>Leader (This Device) *</span>
                      <Input
                        value={member1}
                        onChange={(e) => setMember1(e.target.value)}
                        placeholder="Member 1 Full Name"
                        required
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>Member 2 *</span>
                      <Input
                        value={member2}
                        onChange={(e) => setMember2(e.target.value)}
                        placeholder="Member 2 Full Name"
                        required
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>Member 3 *</span>
                      <Input
                        value={member3}
                        onChange={(e) => setMember3(e.target.value)}
                        placeholder="Member 3 Full Name"
                        required
                      />
                    </div>

                    {showMember4 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>Member 4 (Optional)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMember4(false);
                              setMember4('');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--bad)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>
                        <Input
                          value={member4}
                          onChange={(e) => setMember4(e.target.value)}
                          placeholder="Member 4 Full Name"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMember4(true)}
                        style={{
                          background: 'none',
                          border: '1px dashed var(--line-bright)',
                          color: 'var(--accent)',
                          padding: '9px',
                          borderRadius: 'var(--r-sm)',
                          fontSize: '12.5px',
                          fontFamily: 'var(--font-hud)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginTop: '4px'
                        }}
                      >
                        + Add 4th Squad Member
                      </button>
                    )}
                  </div>
                </div>

                {regError && (
                  <div
                    style={{
                      background: 'rgba(255, 67, 90, 0.12)',
                      border: '1px solid var(--bad)',
                      color: 'var(--bad)',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    ⚠️ {regError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  disabled={isSubmitting}
                  className="animate-pulse-gold"
                  style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '6px' }}
                >
                  {isSubmitting ? 'INITIATING MISSION...' : '🚀 REGISTER SQUAD & ENTER STANDBY'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResume} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-hud)', color: 'var(--cyan)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    REGISTERED SQUAD NAME *
                  </label>
                  <Input
                    value={resumeTeamName}
                    onChange={(e) => setResumeTeamName(e.target.value)}
                    placeholder="Enter squad name"
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-hud)', color: 'var(--cyan)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    YOUR FULL NAME *
                  </label>
                  <Input
                    value={resumeMemberName}
                    onChange={(e) => setResumeMemberName(e.target.value)}
                    placeholder="Enter your name as registered"
                  />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  ℹ️ Your device token will be bound to your member slot. If your phone died and you are switching devices, ask your coordinator to unbind your previous slot.
                </div>

                {resumeError && (
                  <div
                    style={{
                      background: 'rgba(255, 67, 90, 0.12)',
                      border: '1px solid var(--bad)',
                      color: 'var(--bad)',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    ⚠️ {resumeError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '6px' }}
                >
                  {isSubmitting ? 'CONNECTING...' : '🔄 RE-ENTER ARENA'}
                </Button>
              </form>
            )}
          </Card>

          {/* Quick link to live leaderboard */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link
              href="/leaderboard"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cyan)',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-hud)',
                letterSpacing: '0.5px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🏆 View Live Event Leaderboard →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Input, Modal } from '@/components/common/UI';
import { InvictorsLogo } from '@/components/common/Logos';
import { showToast } from '@/store';
import { supabaseBrowser } from '@/lib/supabaseClient';

const COORDINATOR_NAMES = [
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

export default function CoordinatorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [coordName, setCoordName] = useState('Akul P Yadav');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Dashboard Data
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [, setLoadingTimeline] = useState(false);

  // Call Admin Dialog
  const [showCallModal, setShowCallModal] = useState(false);
  const [callMessage, setCallMessage] = useState('');
  const [callingAdmin, setCallingAdmin] = useState(false);

  // Check existing session
  useEffect(() => {
    fetch('/api/coordinator/session')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.authenticated) {
          setIsAuthenticated(true);
          setCoordName(data.coordinator);
          loadTeams();
        }
      })
      .catch(() => {});

    // Listen to WebSocket coord updates
    const onCoordUpdate = (e: any) => {
      if (e.detail?.type === 'coord:update') {
        loadTeams();
      }
    };
    window.addEventListener('fo:ws_message', onCoordUpdate);
    return () => window.removeEventListener('fo:ws_message', onCoordUpdate);
  }, []);

  // Instant Supabase Realtime synchronization for Coordinator Portal
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabaseBrowser
      .channel(`coord-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      loadTeams();
    }, 3000);

    return () => {
      supabaseBrowser.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (lockoutSeconds > 0) return;
    setLoginError('');
    setIsShaking(false);

    try {
      const res = await fetch('/api/coordinator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: coordName, pin })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setCoordName(data.coordinator);
        showToast(`Welcome Coordinator ${data.coordinator}`, 'gold');
        loadTeams();
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setLoginError(data.error || 'Authentication failed');
        if (data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/coordinator/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setPin('');
      setTeams([]);
      showToast('Logged out of Coordinator Portal', 'ok');
    } catch {}
  }

  async function loadTeams() {
    try {
      const res = await fetch('/api/coordinator/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch {}
  }

  async function loadTimeline(team: any) {
    setSelectedTeam(team);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/coordinator/team/${team.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      }
    } catch {
      showToast('Failed to load team details', 'bad');
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function handleSendAdminAlert() {
    if (!callMessage.trim()) return;
    setCallingAdmin(true);
    try {
      const res = await fetch('/api/coordinator/call-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam?.id || null,
          message: callMessage.trim()
        })
      });
      if (res.ok) {
        showToast('Alert dispatched to Master Admin! 🚨', 'gold');
        setShowCallModal(false);
        setCallMessage('');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to dispatch alert', 'bad');
      }
    } catch (e: any) {
      showToast(e.message, 'bad');
    } finally {
      setCallingAdmin(false);
    }
  }

  // Statistics calculation for assigned teams
  const totalRegistered = teams.length;
  const finishedCount = teams.filter((t) => t.isCompleted).length;
  const stuckCount = teams.filter((t) => !t.isCompleted && t.status === 'stuck').length;
  const onTrackCount = teams.filter((t) => !t.isCompleted && t.status !== 'stuck' && t.status !== 'time_up').length;
  let stageSum = 0;
  for (const t of teams) stageSum += t.isCompleted ? 6 : t.currentStage;
  const avgStage = totalRegistered > 0 ? (stageSum / totalRegistered).toFixed(1) : '1.0';

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'var(--bg)'
        }}
      >
        <Card
          className={isShaking ? 'animate-shake' : ''}
          style={{ width: '100%', maxWidth: '420px', padding: '32px 24px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <InvictorsLogo size={64} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--txt)' }}>
              Coordinator Portal
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Invictors Club · Dept. of CSE, VVCE Mysuru
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                Select Coordinator
              </label>
              <select
                className="input"
                value={coordName}
                onChange={(e: any) => setCoordName(e.target.value)}
                style={{ width: '100%' }}
                disabled={lockoutSeconds > 0}
              >
                {COORDINATOR_NAMES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                Coordinator PIN
              </label>
              <Input
                type="password"
                value={pin}
                onInput={(e: any) => setPin(e.target.value)}
                placeholder="Enter PIN (e.g. ARUN#234)"
                disabled={lockoutSeconds > 0}
                autoFocus
              />
            </div>

            {loginError && (
              <div style={{ color: 'var(--bad)', fontSize: '12px' }}>
                ⚠️ {loginError}
              </div>
            )}

            {lockoutSeconds > 0 && (
              <div
                style={{
                  color: 'var(--bad)',
                  fontSize: '12px',
                  background: 'rgba(255, 93, 108, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 93, 108, 0.3)'
                }}
              >
                ⏳ Authentication locked for <strong>{lockoutSeconds}s</strong> due to consecutive failed attempts.
              </div>
            )}

            <Button
              type="submit"
              variant="gold"
              disabled={lockoutSeconds > 0}
              style={{ marginTop: '8px' }}
            >
              Sign In to Venue Portal
            </Button>

            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button
                variant="ghost"
                type="button"
                style={{ fontSize: '12px', width: '100%' }}
              >
                &larr; Back to Public Game
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg2)',
            padding: '16px 20px',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--line)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <InvictorsLogo size={40} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--txt)' }}>
                Venue Coordinator: <span style={{ color: 'var(--gold)' }}>{coordName}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Viewing assigned squads only · Zero answer access enforced
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="danger"
              style={{ fontSize: '12px' }}
              onClick={() => {
                setShowCallModal(true);
              }}
            >
              🚨 Call Master Admin
            </Button>
            <Button variant="ghost" style={{ fontSize: '12px' }} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Coordinator Stat Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <Card>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ASSIGNED SQUADS</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
              {totalRegistered}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ON TRACK</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ok)', marginTop: '4px' }}>
              {onTrackCount}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>STUCK (&gt;15m)</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--amber)', marginTop: '4px' }}>
              {stuckCount}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>FINISHED (6/6)</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gold)', marginTop: '4px' }}>
              {finishedCount}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>AVG SQUAD STAGE</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--cyan)', marginTop: '4px' }}>
              {avgStage} <span style={{ fontSize: '14px', color: 'var(--muted)' }}>/ 6</span>
            </div>
          </Card>
        </div>

        {/* Assigned Teams Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--txt)' }}>
              Assigned Squads ({teams.length})
            </h2>
            <Button variant="ghost" style={{ fontSize: '12px' }} onClick={loadTeams}>
              🔄 Refresh List
            </Button>
          </div>

          <div className="cyber-table-wrap">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Squad Name</th>
                  <th>Current Stage</th>
                  <th>Elapsed</th>
                  <th>Penalties</th>
                  <th>Total Time</th>
                  <th>Devices</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                      No squads registered under Coordinator {coordName} yet.
                    </td>
                  </tr>
                ) : (
                  teams.map((t) => {
                    const elMin = Math.floor(t.elapsedSeconds / 60);
                    const elSec = t.elapsedSeconds % 60;
                    const totMin = Math.floor(t.finalTimeSeconds / 60);
                    const totSec = t.finalTimeSeconds % 60;

                    return (
                      <tr
                        key={t.id}
                        className="clickable"
                        onClick={() => loadTimeline(t)}
                        style={{
                          background: selectedTeam?.id === t.id ? 'rgba(39, 180, 255, 0.12)' : undefined
                        }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--txt)' }}>
                          {t.name}
                          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                            PIN: {t.teamPin}
                          </div>
                        </td>
                        <td>
                          {t.isCompleted ? (
                            <span style={{ color: 'var(--ok)', fontWeight: 700 }}>Finished (6/6)</span>
                          ) : (
                            <span>Stage {t.currentStage} of 6</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {elMin}m {elSec < 10 ? '0' : ''}{elSec}s
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: t.penaltySeconds > 0 ? 'var(--bad)' : 'var(--muted)' }}>
                          +{Math.floor(t.penaltySeconds / 60)}m {t.penaltySeconds % 60}s
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                          {totMin}m {totSec < 10 ? '0' : ''}{totSec}s
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                            📱 {t.devicesCount || 1}
                          </span>
                        </td>
                        <td>
                          {t.isCompleted ? (
                            <span className="status-chip status-chip-finished">Finished</span>
                          ) : t.status === 'time_up' ? (
                            <span className="status-chip status-chip-timeup">Time Up</span>
                          ) : t.status === 'stuck' ? (
                            <span className="status-chip status-chip-stuck">Stuck</span>
                          ) : (
                            <span className="status-chip status-chip-progress">On Track</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Read-Only Team Drawer */}
        {selectedTeam && timeline && (
          <div className="drawer-overlay" onClick={() => setSelectedTeam(null)}>
            <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--txt)' }}>
                    {selectedTeam.name}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--gold)' }}>
                    PIN: {selectedTeam.teamPin} · Assigned to {coordName}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {/* Members */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Squad Roster
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedTeam.members?.map((m: any) => (
                    <span
                      key={m.id}
                      style={{
                        background: m.isLeader ? 'rgba(255, 184, 31, 0.2)' : 'var(--bg)',
                        border: `1px solid ${m.isLeader ? 'var(--gold)' : 'var(--line)'}`,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: m.isLeader ? 'var(--gold)' : 'var(--txt)'
                      }}
                    >
                      {m.isLeader ? '👑 ' : ''}{m.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action: Call Admin for this Squad */}
              <Button
                variant="gold"
                style={{ width: '100%', marginBottom: '16px', fontSize: '13px' }}
                onClick={() => {
                  setCallMessage(`Assistance requested for squad "${selectedTeam.name}": `);
                  setShowCallModal(true);
                }}
              >
                🚨 Request Admin Assistance for this Squad
              </Button>

              {/* Read-Only Timeline */}
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--txt)' }}>
                Activity Timeline
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {timeline.events?.map((ev: any, idx: number) => {
                  const date = new Date(ev.timestamp);
                  const tStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: ev.type === 'violation' ? 'var(--bad)' : ev.type === 'stage_complete' ? 'var(--ok)' : 'var(--txt)' }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {ev.detail}
                        </div>
                      </div>

                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                        {tStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CALL ADMIN MODAL */}
        <Modal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          title="🚨 Dispatch Call to Master Admin"
          confirmText={callingAdmin ? 'Sending...' : 'Dispatch Alert'}
          confirmVariant="gold"
          onConfirm={handleSendAdminAlert}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--txt)', lineHeight: 1.5 }}>
              This will send an immediate high-priority alert to the Master Admin alert strip.
            </p>
            <Input
              value={callMessage}
              onInput={(e: any) => setCallMessage(e.target.value)}
              placeholder="e.g. Broken phone screen, need unbind for squad member"
              autoFocus
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}

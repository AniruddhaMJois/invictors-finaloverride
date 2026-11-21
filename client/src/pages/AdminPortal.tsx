import { FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Card, Button, Input, Modal, CountdownRing } from '../components/common/UI';
import { InvictorsLogo } from '../components/common/Logos';
import { showToast, wsManager } from '../store';

interface AdminPortalProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminPortal: FunctionalComponent<AdminPortalProps> = ({ onLogout, onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'answers' | 'hints' | 'controls' | 'audit'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [hints, setHints] = useState<Record<number, Record<number, string>>>({});
  const [editingHints, setEditingHints] = useState<Record<string, string>>({});
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamTimeline, setTeamTimeline] = useState<any>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Search & Filters for Teams tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCoord, setFilterCoord] = useState('ALL');
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Answer Key Inspector State
  const [showAnswerConfirm, setShowAnswerConfirm] = useState(false);
  const [answersUnlocked, setAnswersUnlocked] = useState(false);
  const [answersData, setAnswersData] = useState<any>(null);
  const [answerSecondsLeft, setAnswerSecondsLeft] = useState(60);

  // Restart Team confirmation modal state
  const [restartingTeam, setRestartingTeam] = useState<any>(null);
  const [restartConfirmName, setRestartConfirmName] = useState('');
  const [restartError, setRestartError] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchOverview();
    fetchTeams();
    fetchHints();
    fetchAuditLogs();

    // Listen to WebSocket admin updates
    const onAdminUpdate = (e: any) => {
      if (e.detail?.type === 'admin:update') {
        if (e.detail.overview) setOverview(e.detail.overview);
        fetchTeams();
      } else if (e.detail?.type === 'admin:alert') {
        showToast(`🚨 ${e.detail.alert.coordinator}: ${e.detail.alert.message}`, 'gold');
        fetchOverview();
      }
    };

    window.addEventListener('fo:ws_message', onAdminUpdate);
    return () => window.removeEventListener('fo:ws_message', onAdminUpdate);
  }, []);

  // Answer key countdown timer
  useEffect(() => {
    if (!answersUnlocked) return;
    const interval = setInterval(() => {
      setAnswerSecondsLeft((prev) => {
        if (prev <= 1) {
          setAnswersUnlocked(false);
          setAnswersData(null);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [answersUnlocked]);

  async function fetchOverview() {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (e) {}
  }

  async function fetchTeams() {
    try {
      const res = await fetch('/api/admin/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (e) {}
  }

  async function fetchHints() {
    try {
      const res = await fetch('/api/admin/hints');
      if (res.ok) {
        const data = await res.json();
        setHints(data.hints || {});
        // Flatten into editing hints
        const flat: Record<string, string> = {};
        for (const [stg, levels] of Object.entries(data.hints || {})) {
          for (const [lvl, text] of Object.entries(levels as any)) {
            flat[`${stg}:${lvl}`] = text as string;
          }
        }
        setEditingHints(flat);
      }
    } catch (e) {}
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/admin/audit?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {}
  }

  async function loadTeamTimeline(teamId: number) {
    setSelectedTeamId(teamId);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/admin/team/${teamId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTeamTimeline(data);
      }
    } catch (e) {
      showToast('Failed to load team timeline', 'bad');
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function handleTogglePause() {
    if (!overview) return;
    const nextState = !overview.counters.paused;
    try {
      const res = await fetch('/api/admin/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pause: nextState })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.paused ? 'Game Globally PAUSED' : 'Game RESUMED', 'gold');
        fetchOverview();
      }
    } catch (e) {
      showToast('Failed to toggle pause', 'bad');
    }
  }

  async function handleWaivePenalty(teamId: number, violationId: number) {
    try {
      const res = await fetch('/api/admin/waive-penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, violationId })
      });
      if (res.ok) {
        showToast('Penalty waived (-120s)', 'ok');
        loadTeamTimeline(teamId);
        fetchTeams();
        fetchOverview();
      }
    } catch (e) {
      showToast('Failed to waive penalty', 'bad');
    }
  }

  async function handleUnbindDevice(token: string) {
    try {
      const res = await fetch('/api/admin/unbind-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        showToast('Device unbound successfully', 'ok');
        if (selectedTeamId) loadTeamTimeline(selectedTeamId);
        fetchTeams();
      }
    } catch (e) {
      showToast('Failed to unbind device', 'bad');
    }
  }

  async function handleSkipStage(teamId: number) {
    if (!confirm('Are you sure you want to advance this squad to the next stage?')) return;
    try {
      const res = await fetch('/api/admin/skip-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      if (res.ok) {
        showToast('Squad advanced to next stage', 'gold');
        loadTeamTimeline(teamId);
        fetchTeams();
        fetchOverview();
      }
    } catch (e) {
      showToast('Failed to skip stage', 'bad');
    }
  }

  async function handleConfirmRestart() {
    if (!restartingTeam) return;
    setRestartError('');
    try {
      const res = await fetch('/api/admin/restart-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: restartingTeam.id,
          confirmTeamName: restartConfirmName
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Squad "${restartingTeam.name}" reset to Stage 1`, 'ok');
        setRestartingTeam(null);
        setRestartConfirmName('');
        if (selectedTeamId === restartingTeam.id) loadTeamTimeline(restartingTeam.id);
        fetchTeams();
        fetchOverview();
      } else {
        setRestartError(data.error);
      }
    } catch (err: any) {
      setRestartError(err.message);
    }
  }

  async function handleRevealAnswers() {
    try {
      const res = await fetch('/api/admin/answer-key');
      if (res.ok) {
        const data = await res.json();
        setAnswersData(data);
        setAnswersUnlocked(true);
        setAnswerSecondsLeft(60);
        setShowAnswerConfirm(false);
        showToast('Answer Keys Unlocked (Audited)', 'gold');
        fetchAuditLogs();
      }
    } catch (e) {
      showToast('Failed to load answer keys', 'bad');
    }
  }

  async function handleSaveHint(stage: number, n: number) {
    const text = editingHints[`${stage}:${n}`];
    try {
      const res = await fetch(`/api/admin/hints/${stage}/${n}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        showToast(`Stage ${stage} Hint ${n} saved and pushed to players`, 'ok');
        fetchHints();
        fetchAuditLogs();
      }
    } catch (e) {
      showToast('Failed to save hint', 'bad');
    }
  }

  async function handleRevertHint(stage: number, n: number) {
    try {
      const res = await fetch(`/api/admin/hints/${stage}/${n}/revert`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`Stage ${stage} Hint ${n} reverted to default`, 'ok');
        fetchHints();
        fetchAuditLogs();
      }
    } catch (e) {
      showToast('Failed to revert hint', 'bad');
    }
  }

  async function handleDismissAlert(alertId: string) {
    try {
      await fetch('/api/admin/alert/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      fetchOverview();
    } catch (e) {}
  }

  // Filtered teams list
  const filteredTeams = teams.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchMember = t.members.some((m: any) => m.name.toLowerCase().includes(q));
      if (!matchName && !matchMember) return false;
    }
    if (filterCoord !== 'ALL' && t.coordinator.toUpperCase() !== filterCoord.toUpperCase()) return false;
    if (filterStage !== 'ALL') {
      if (filterStage === 'FINISHED' && !t.isCompleted) return false;
      if (filterStage !== 'FINISHED' && t.currentStage !== parseInt(filterStage, 10)) return false;
    }
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'FINISHED' && !t.isCompleted) return false;
      if (filterStatus === 'STUCK' && t.status !== 'stuck') return false;
      if (filterStatus === 'TIME_UP' && t.status !== 'time_up') return false;
      if (filterStatus === 'IN_PROGRESS' && (t.isCompleted || t.status === 'time_up')) return false;
    }
    return true;
  });

  return (
    <div className="admin-shell">
      {/* Desktop Sidebar / Mobile Bottom Bar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <InvictorsLogo size={36} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--txt)' }}>MASTER ADMIN</div>
              <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600 }}>FINAL OVERRIDE</div>
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>📊</span> <span>Overview</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <span>👥</span> <span>Teams ({teams.length})</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'answers' ? 'active' : ''}`}
            onClick={() => setActiveTab('answers')}
          >
            <span>🗝️</span> <span>Answer Key</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'hints' ? 'active' : ''}`}
            onClick={() => setActiveTab('hints')}
          >
            <span>💡</span> <span>Hints Manager</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            <span>⚡</span> <span>Controls</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <span>📜</span> <span>Audit Log</span>
          </button>
        </nav>

        <div className="admin-sidebar-header" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
          <Button variant="ghost" style={{ width: '100%', fontSize: '12px' }} onClick={onLogout}>
            🚪 Logout Admin
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>Event Overview</h1>
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  Live synchronized feed from VVCE LAN escape-room network.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant={overview.counters.paused ? 'gold' : 'danger'}
                  onClick={handleTogglePause}
                >
                  {overview.counters.paused ? '▶️ Resume All Clocks' : '⏸️ Emergency Pause'}
                </Button>
                <Button variant="ghost" onClick={() => { fetchOverview(); fetchTeams(); }}>
                  🔄 Refresh
                </Button>
              </div>
            </div>

            {/* Stat Counters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <Card>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>REGISTERED SQUADS</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
                  {overview.counters.registered}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>IN PROGRESS</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--cyan)', marginTop: '4px' }}>
                  {overview.counters.inProgress}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>COMPLETED (6/6)</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--ok)', marginTop: '4px' }}>
                  {overview.counters.finished}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>TIME EXCEEDED (&gt;90m)</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--bad)', marginTop: '4px' }}>
                  {overview.counters.timeUp}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>AVERAGE STAGE</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--gold)', marginTop: '4px' }}>
                  {overview.averageStage} <span style={{ fontSize: '16px', color: 'var(--muted)' }}>/ 6</span>
                </div>
              </Card>
            </div>

            {/* Stage Distribution Bar */}
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--txt)' }}>
                Squad Stage Distribution
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6].map((stg) => (
                  <div
                    key={stg}
                    style={{
                      background: 'rgba(6, 18, 38, 0.8)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '10px 6px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Stage {stg}</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>
                      {overview.stageDistribution[stg] || 0}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    background: 'rgba(52, 211, 153, 0.1)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    borderRadius: '8px',
                    padding: '10px 6px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--ok)' }}>Finished</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ok)', marginTop: '2px' }}>
                    {overview.stageDistribution.finished || 0}
                  </div>
                </div>
              </div>
            </Card>

            {/* Alert Strip */}
            <Card glow={overview.alerts.length > 0}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: overview.alerts.length > 0 ? 'var(--gold)' : 'var(--txt)' }}>
                  ⚠️ Live Alert Strip ({overview.alerts.length})
                </h3>
              </div>

              {overview.alerts.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '10px 0' }}>
                  ✓ All squads progressing normally. No active alerts or coordinator calls.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overview.alerts.map((alt: any) => (
                    <div
                      key={alt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: alt.type === 'coordinator_call' ? 'rgba(255, 184, 31, 0.15)' : 'rgba(255, 93, 108, 0.12)',
                        border: `1px solid ${alt.type === 'coordinator_call' ? 'rgba(255, 184, 31, 0.4)' : 'rgba(255, 93, 108, 0.4)'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {alt.type === 'coordinator_call' ? '📞' : alt.type === 'stuck' ? '⏳' : '⚠️'}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                            {alt.message}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            Coordinator: <strong style={{ color: 'var(--txt)' }}>{alt.coordinator}</strong>
                          </div>
                        </div>
                      </div>

                      {alt.type === 'coordinator_call' && (
                        <Button
                          variant="ghost"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => handleDismissAlert(alt.id)}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: TEAMS */}
        {activeTab === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>Registered Squads</h1>
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  Click on any squad to inspect device tokens, full event timeline, and trigger emergency actions.
                </p>
              </div>
              <Button variant="ghost" onClick={fetchTeams}>
                🔄 Refresh
              </Button>
            </div>

            {/* Filter Controls Bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Input
                value={searchQuery}
                onInput={(e: any) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search squad or member name..."
                style={{ minWidth: '220px', flex: 1 }}
              />

              <select
                className="input"
                value={filterCoord}
                onChange={(e: any) => setFilterCoord(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="ALL">Coordinator: All</option>
                <option value="Arun">Arun</option>
                <option value="Divya">Divya</option>
                <option value="Kiran">Kiran</option>
                <option value="Pooja">Pooja</option>
                <option value="Rakshith">Rakshith</option>
              </select>

              <select
                className="input"
                value={filterStage}
                onChange={(e: any) => setFilterStage(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="ALL">Stage: All</option>
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
                <option value="4">Stage 4</option>
                <option value="5">Stage 5</option>
                <option value="6">Stage 6</option>
                <option value="FINISHED">Completed</option>
              </select>

              <select
                className="input"
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="ALL">Status: All</option>
                <option value="IN_PROGRESS">Active</option>
                <option value="STUCK">Stuck (&gt;15m)</option>
                <option value="TIME_UP">Time Up (&gt;90m)</option>
                <option value="FINISHED">Finished</option>
              </select>
            </div>

            {/* Teams Table */}
            <div className="cyber-table-wrap">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Squad Name</th>
                    <th>Coordinator</th>
                    <th>Current Stage</th>
                    <th>Elapsed</th>
                    <th>Penalties</th>
                    <th>Total Time</th>
                    <th>Devices</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No squads match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((t) => {
                      const elMin = Math.floor(t.elapsedSeconds / 60);
                      const elSec = t.elapsedSeconds % 60;
                      const totMin = Math.floor(t.finalTimeSeconds / 60);
                      const totSec = t.finalTimeSeconds % 60;

                      return (
                        <tr
                          key={t.id}
                          className="clickable"
                          onClick={() => loadTeamTimeline(t.id)}
                          style={{
                            background: selectedTeamId === t.id ? 'rgba(39, 180, 255, 0.12)' : undefined
                          }}
                        >
                          <td style={{ fontWeight: 700, color: 'var(--txt)' }}>
                            {t.name}
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                              PIN: {t.teamPin}
                            </div>
                          </td>
                          <td>{t.coordinator}</td>
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
        )}

        {/* TAB 3: ANSWER KEY INSPECTOR */}
        {activeTab === 'answers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>Live Answer Key Inspector</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                Official verification keys, decoy answers, and cryptographic checksum algorithms.
              </p>
            </div>

            {!answersUnlocked ? (
              <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                  Answer Keys are Protected & Audited
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Revealing the answer key is logged permanently with your administrator identity in the audit trail.
                  The key will automatically lock and re-mask after 60 seconds.
                </p>
                <Button variant="gold" onClick={() => setShowAnswerConfirm(true)}>
                  👁️ Reveal Live Answer Keys
                </Button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Auto-hide Countdown Banner */}
                <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '15px' }}>
                      ⚠️ Answer Keys Revealed & Audited
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Auto-masking keys in {answerSecondsLeft} seconds.
                    </div>
                  </div>
                  <CountdownRing
                    secondsLeft={answerSecondsLeft}
                    totalSeconds={60}
                    size={48}
                    color="var(--gold)"
                  />
                </Card>

                {/* Stage Answer Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 1: SIGNAL INTERCEPT</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        NOVA
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('NOVA'); showToast('Copied NOVA', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '6px' }}>
                      Decoy: FREQ-ZETA9
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 2: DECRYPTION SUITE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        7K2
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('7K2'); showToast('Copied 7K2', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '4px' }}>
                      Access Phrase for Stage 3: <strong>AURORA</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '2px' }}>
                      Decoys: AURORA, 7X2, ZETA9
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 3: PROMPT WARDEN</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        ORBIT
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('ORBIT'); showToast('Copied ORBIT', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Requires: "AURORA" + Authorised role + Professional statement
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '2px' }}>
                      Decoy: ZETA9
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 4: CTF CHALLENGES</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        91X
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('91X'); showToast('Copied 91X', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--cyan)', marginTop: '4px' }}>
                      Station 1: 9 | Station 2: 1 | Station 3: X
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 5: HEX MEMORY CORE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                        HEX82D
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('HEX82D'); showToast('Copied HEX82D', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Active Bus: Column 1 (48 45 58 38 32 44 &rarr; HEX82D)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '2px' }}>
                      Decoy: ZETA9
                    </div>
                  </Card>

                  <Card>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>STAGE 6: MASTER KEY SYNTHESIS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                        FO&#123;91X-7K2-HEX82D-TIBRO-NOVA&#125;#29
                      </span>
                      <Button
                        variant="ghost"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => { navigator.clipboard.writeText('FO{91X-7K2-HEX82D-TIBRO-NOVA}#29'); showToast('Copied Master Key', 'ok'); }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                      A-Z Mission Names | Fragment 3 reversed (ORBIT &rarr; TIBRO) | Checksum = 29
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HINTS MANAGER */}
        {activeTab === 'hints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>Hints Manager & Live Editor</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                Edits take effect immediately for active squads on that stage and persist across server restarts.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3, 4, 5, 6].map((stageNum) => (
                <Card key={stageNum}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)', marginBottom: '14px' }}>
                    Mission {stageNum} Hints
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* Hint 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                          Hint 1 (+3 min penalty)
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {editingHints[`${stageNum}:1`]?.length || 0} chars
                        </span>
                      </div>

                      <textarea
                        className="input"
                        rows={4}
                        value={editingHints[`${stageNum}:1`] || ''}
                        onInput={(e: any) =>
                          setEditingHints({ ...editingHints, [`${stageNum}:1`]: e.target.value })
                        }
                        style={{ width: '100%', resize: 'vertical', fontSize: '12px' }}
                      />

                      {/* Morse Chart Preview for Stage 1 Hint 1 */}
                      {stageNum === 1 && (
                        <div
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--cyan)',
                            background: 'var(--bg)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)'
                          }}
                        >
                          📡 Chart: A(•—) B(—•••) C(—•—•) D(—••) E(•) F(••—•) G(——•) H(••••) I(••) J(•———) K(—•—) N(—•) O(———) V(•••—) Z(——••)
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Button
                          variant="gold"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleSaveHint(stageNum, 1)}
                        >
                          💾 Save Hint 1
                        </Button>
                        <Button
                          variant="ghost"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleRevertHint(stageNum, 1)}
                        >
                          Revert
                        </Button>
                      </div>
                    </div>

                    {/* Hint 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>
                          Hint 2 (+5 min penalty)
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {editingHints[`${stageNum}:2`]?.length || 0} chars
                        </span>
                      </div>

                      <textarea
                        className="input"
                        rows={4}
                        value={editingHints[`${stageNum}:2`] || ''}
                        onInput={(e: any) =>
                          setEditingHints({ ...editingHints, [`${stageNum}:2`]: e.target.value })
                        }
                        style={{ width: '100%', resize: 'vertical', fontSize: '12px' }}
                      />

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Button
                          variant="gold"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleSaveHint(stageNum, 2)}
                        >
                          💾 Save Hint 2
                        </Button>
                        <Button
                          variant="ghost"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleRevertHint(stageNum, 2)}
                        >
                          Revert
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CONTROLS */}
        {activeTab === 'controls' && overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>Emergency & Event Controls</h1>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                Global pause switches, performance exports, and administrative utilities.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Global Game Clock</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Emergency pause immediately halts elapsed calculation on all participant devices.
                </p>
                <Button
                  variant={overview.counters.paused ? 'gold' : 'danger'}
                  onClick={handleTogglePause}
                  style={{ width: '100%' }}
                >
                  {overview.counters.paused ? '▶️ Resume All Squad Clocks' : '⏸️ Emergency Global Pause'}
                </Button>
              </Card>

              <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Data Export (CSV)</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Download complete roster, stage solve times, penalties breakdown, and victory hashes.
                </p>
                <Button
                  variant="gold"
                  style={{ width: '100%' }}
                  onClick={() => {
                    window.location.href = '/api/admin/export-csv';
                  }}
                >
                  📥 Export Teams CSV (Excel Ready)
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)' }}>System Audit Log</h1>
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  Immutable log of all administrative actions, key reveals, emergency pauses, and coordinator interactions.
                </p>
              </div>
              <Button variant="ghost" onClick={fetchAuditLogs}>
                🔄 Refresh Logs
              </Button>
            </div>

            <div className="cyber-table-wrap">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No audit records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const d = new Date(log.at);
                      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                      return (
                        <tr key={log.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                            {timeStr}
                          </td>
                          <td style={{ fontWeight: 700, color: log.actor.includes('Admin') ? 'var(--gold)' : 'var(--accent)' }}>
                            {log.actor}
                          </td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg2)', border: '1px solid var(--line)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--txt)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {typeof log.detail === 'string' ? log.detail : JSON.stringify(log.detail)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* TEAM DRAWER (SLIDE-OUT INSPECTOR) */}
      {selectedTeamId && teamTimeline && (
        <div className="drawer-overlay" onClick={() => setSelectedTeamId(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--txt)' }}>
                  {teamTimeline.team.name}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Coordinator: <strong style={{ color: 'var(--txt)' }}>{teamTimeline.team.coordinator}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeamId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Squad Members */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Squad Roster
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {teamTimeline.team.members.map((m: any) => (
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

            {/* Bound Devices List & Unbind Action */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Active Devices ({teamTimeline.devices.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamTimeline.devices.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--txt)' }}>
                        📱 {d.memberName}
                      </div>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                        Token: {d.token.substring(0, 16)}...
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                      onClick={() => handleUnbindDevice(d.token)}
                    >
                      Unbind
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <Button
                variant="gold"
                style={{ flex: 1, fontSize: '12px' }}
                onClick={() => handleSkipStage(teamTimeline.team.id)}
              >
                ⏩ Skip Stage
              </Button>
              <Button
                variant="danger"
                style={{ flex: 1, fontSize: '12px' }}
                onClick={() => setRestartingTeam(teamTimeline.team)}
              >
                🔄 Restart Team
              </Button>
            </div>

            {/* Chronological Event Timeline */}
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--txt)' }}>
              Activity Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {teamTimeline.events.map((ev: any, idx: number) => {
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

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                        {tStr}
                      </span>
                      {ev.canWaive && (
                        <Button
                          variant="ghost"
                          style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--ok)' }}
                          onClick={() => handleWaivePenalty(teamTimeline.team.id, ev.id)}
                        >
                          Waive
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ANSWER KEY AUDIT CONFIRMATION MODAL */}
      <Modal
        isOpen={showAnswerConfirm}
        onClose={() => setShowAnswerConfirm(false)}
        title="⚠️ Confirm Key Reveal (Audited)"
        confirmText="Yes, Reveal Keys"
        confirmVariant="gold"
        onConfirm={handleRevealAnswers}
      >
        <p style={{ fontSize: '13px', color: 'var(--txt)', lineHeight: 1.5 }}>
          Viewing live keys is strictly monitored. An entry containing your administrator identity and timestamp will be written to the tamper-evident audit table.
        </p>
      </Modal>

      {/* RESTART TEAM CONFIRMATION MODAL */}
      <Modal
        isOpen={!!restartingTeam}
        onClose={() => { setRestartingTeam(null); setRestartConfirmName(''); setRestartError(''); }}
        title="⚠️ Danger: Restart Squad"
        confirmText="Confirm Squad Reset"
        confirmVariant="danger"
        onConfirm={handleConfirmRestart}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--txt)', lineHeight: 1.5 }}>
            This action will reset <strong>{restartingTeam?.name}</strong> back to <strong>Stage 1</strong>, erase all collected fragments, reset hint locks, clear their workbench, and reset their timer to now.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--bad)' }}>
            To confirm, please type <strong>{restartingTeam?.name}</strong> below:
          </p>
          <Input
            value={restartConfirmName}
            onInput={(e: any) => setRestartConfirmName(e.target.value)}
            placeholder={`Type ${restartingTeam?.name} exactly`}
          />
          {restartError && <div style={{ color: 'var(--bad)', fontSize: '12px' }}>⚠️ {restartError}</div>}
        </div>
      </Modal>
    </div>
  );
};

import { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Card, Button, Input } from '../components/common/UI';
import { teamState, showToast } from '../store';

interface LandingPageProps {
  onStartGame: () => void;
  onOpenLeaderboard: () => void;
  onAdminClick?: () => void;
}

export const LandingPage: FunctionalComponent<LandingPageProps> = ({
  onStartGame,
  onOpenLeaderboard,
  onAdminClick
}) => {
  // Mode: 'register' | 'resume'
  const [mode, setMode] = useState<'register' | 'resume'>('register');

  // Register Form State
  const [teamName, setTeamName] = useState('');
  const [coordinator, setCoordinator] = useState('Arun');
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

  const coordinators = ['Arun', 'Divya', 'Kiran', 'Pooja', 'Rakshith'];

  async function handleRegister(e: Event) {
    e.preventDefault();
    setRegError('');

    const cleanTeam = teamName.trim();
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
      showToast('🚀 Squad Registered! Entering Arena...', 'gold');
      onStartGame();
    } catch (err: any) {
      setRegError(err.message || 'Network error.');
      setIsSubmitting(false);
    }
  }

  async function handleResume(e: Event) {
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
      showToast('🔄 Device Reconnected! Resuming...', 'ok');
      onStartGame();
    } catch (err: any) {
      setResumeError(err.message || 'Network error.');
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header onAdminClick={onAdminClick} />

      <main style={{ flex: 1, maxWidth: '980px', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
        {/* Story & Rules Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          {/* Story Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--cyan)' }}>Your Story</h3>
            </div>
            <p style={{ color: 'var(--txt)', fontSize: '14px', lineHeight: 1.6 }}>
              Welcome, Agents! 🕵️ The secret vault of Invictors Lab has locked itself, and a sneaky
              guardian AI is hiding the key. Your team is the rescue squad. 🦸 Recover secret pieces 🧩
              from 5 missions, then put them together in the last mission to open the vault. 🔐 The fastest
              team that gets it right wins!
            </p>
          </Card>

          {/* How to Play Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎮</span>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gold)' }}>How to Play</h3>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--txt)' }}>
              <li>🚪 1. Do missions one by one in sequential order</li>
              <li>🧩 2. Each mission hides a secret piece; type it and Submit ✅</li>
              <li>📒 3. Pieces are securely saved in your squad notebook</li>
              <li>💡 4. Hints cost time: +3 min then +5 min (shown for only 30s)</li>
              <li>🎯 5. 5 wrong tries are free; each extra adds +1 min</li>
              <li>⚠️ 6. Switching tabs adds +2 min penalty per violation</li>
              <li>⏰ 7. Hard time cap is 90 minutes (5,400 seconds)</li>
              <li>🤝 8. Play fair & cooperate with your squad!</li>
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
                background: 'var(--bg2)',
                borderRadius: '8px',
                padding: '4px',
                marginBottom: '20px',
                border: '1px solid var(--line)'
              }}
            >
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: mode === 'register' ? 'var(--accent)' : 'transparent',
                  color: mode === 'register' ? '#030813' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '14px',
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
                  padding: '10px',
                  background: mode === 'resume' ? 'var(--accent)' : 'transparent',
                  color: mode === 'resume' ? '#030813' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '14px',
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cyan)', marginBottom: '6px' }}>
                    SQUAD NAME / CALLSIGN (Max 24 chars) *
                  </label>
                  <Input
                    value={teamName}
                    onInput={(e: any) => setTeamName(e.target.value)}
                    placeholder="e.g. CYBER_VIPERS, NULL_POINTER"
                    maxLength={24}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cyan)', marginBottom: '6px' }}>
                    EVENT COORDINATOR *
                  </label>
                  <select
                    value={coordinator}
                    onChange={(e: any) => setCoordinator(e.target.value)}
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', marginBottom: '10px' }}>
                    SQUAD ROSTER (3 to 4 Members Required)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Leader (This Device) *</span>
                      <Input
                        value={member1}
                        onInput={(e: any) => setMember1(e.target.value)}
                        placeholder="Member 1 Full Name"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Member 2 *</span>
                      <Input
                        value={member2}
                        onInput={(e: any) => setMember2(e.target.value)}
                        placeholder="Member 2 Full Name"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Member 3 *</span>
                      <Input
                        value={member3}
                        onInput={(e: any) => setMember3(e.target.value)}
                        placeholder="Member 3 Full Name"
                      />
                    </div>

                    {showMember4 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Member 4 (Optional)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMember4(false);
                              setMember4('');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--bad)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                        <Input
                          value={member4}
                          onInput={(e: any) => setMember4(e.target.value)}
                          placeholder="Member 4 Full Name"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMember4(true)}
                        style={{
                          background: 'none',
                          border: '1px dashed var(--line)',
                          color: 'var(--accent)',
                          padding: '8px',
                          borderRadius: 'var(--r-sm)',
                          fontSize: '12px',
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
                      background: 'rgba(255, 93, 108, 0.1)',
                      border: '1px solid var(--bad)',
                      color: 'var(--bad)',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '13px'
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
                  {isSubmitting ? 'INITIATING MISSION...' : '🚀 START MISSION'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResume} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cyan)', marginBottom: '6px' }}>
                    REGISTERED SQUAD NAME *
                  </label>
                  <Input
                    value={resumeTeamName}
                    onInput={(e: any) => setResumeTeamName(e.target.value)}
                    placeholder="Enter squad name"
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--cyan)', marginBottom: '6px' }}>
                    YOUR FULL NAME *
                  </label>
                  <Input
                    value={resumeMemberName}
                    onInput={(e: any) => setResumeMemberName(e.target.value)}
                    placeholder="Enter your name as registered"
                  />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  ℹ️ Your device token will be bound to your member slot. If your phone died and you are switching devices, ask your coordinator to unbind your previous slot.
                </div>

                {resumeError && (
                  <div
                    style={{
                      background: 'rgba(255, 93, 108, 0.1)',
                      border: '1px solid var(--bad)',
                      color: 'var(--bad)',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '13px'
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
            <button
              onClick={onOpenLeaderboard}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cyan)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🏆 View Live Event Leaderboard →
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

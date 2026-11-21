import { FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { LandingPage } from './pages/LandingPage';
import { GameDashboard } from './pages/GameDashboard';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { Modal, Input, Button } from './components/common/UI';
import {
  teamState,
  toasts,
  wsManager,
  syncServerTime,
  isGlobalPaused,
  showToast
} from './store';

export const App: FunctionalComponent = () => {
  // Simple, lightweight URL router (Zero extra heavy libs)
  const [route, setRoute] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/play')) return '/play';
    if (path.startsWith('/leaderboard')) return '/leaderboard';
    return '/';
  });

  // Admin Pin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    // Connect WebSocket
    wsManager.connect();
    // Sync Authoritative Time
    syncServerTime();

    // Check if team cookie already exists & restore state
    fetch('/api/state')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.id) {
          teamState.value = data;
          if (route === '/') setRoute('/play');
        }
      })
      .catch((err) => console.log('Session Check:', err));

    // Handle Browser Popstate
    function onPopState() {
      const p = window.location.pathname;
      if (p.startsWith('/play')) setRoute('/play');
      else if (p.startsWith('/leaderboard')) setRoute('/leaderboard');
      else setRoute('/');
    }

    // Admin Shortcut: Alt + A
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setShowAdminModal(true);
      }
    }

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function navigate(to: string) {
    window.history.pushState({}, '', to);
    setRoute(to);
  }

  // Admin Verification
  async function handleAdminLogin(e?: Event) {
    if (e) e.preventDefault();
    setAdminError('');

    if (adminPin === 'INVICTORS@23') {
      setIsAdminUnlocked(true);
      showToast('Master Admin Unlocked', 'gold');
    } else {
      setAdminError('Invalid Master Admin PIN');
    }
  }

  // Admin Toggle Pause
  async function handleTogglePause() {
    try {
      const nextPause = !isGlobalPaused.value;
      const res = await fetch('/api/admin/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin, pause: nextPause })
      });
      const data = await res.json();
      if (res.ok) {
        isGlobalPaused.value = data.paused;
        showToast(data.paused ? 'Game Globally PAUSED' : 'Game RESUMED', 'gold');
      } else {
        setAdminError(data.error);
      }
    } catch (err: any) {
      setAdminError(err.message);
    }
  }

  return (
    <div>
      {/* Toast Overlay */}
      <div className="toast-container">
        {toasts.value.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.type === 'ok' ? '✅' : t.type === 'gold' ? '⭐' : t.type === 'bad' ? '❌' : 'ℹ️'}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Screen Router */}
      {route === '/play' ? (
        <GameDashboard
          onOpenLeaderboard={() => navigate('/leaderboard')}
          onAdminClick={() => setShowAdminModal(true)}
        />
      ) : route === '/leaderboard' ? (
        <LeaderboardPage onBackToGame={() => navigate(teamState.value ? '/play' : '/')} />
      ) : (
        <LandingPage
          onStartGame={() => navigate('/play')}
          onOpenLeaderboard={() => navigate('/leaderboard')}
        />
      )}

      {/* Master Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setAdminError('');
          setAdminPin('');
        }}
        title="🔐 Master Organiser Control"
      >
        {!isAdminUnlocked ? (
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Enter Master Admin PIN for live event controls.
            </p>
            <Input
              type="password"
              value={adminPin}
              onInput={(e: any) => setAdminPin(e.target.value)}
              placeholder="Enter PIN (INVICTORS@23)"
              autoFocus
            />
            {adminError && <div style={{ color: 'var(--bad)', fontSize: '12px' }}>⚠️ {adminError}</div>}
            <Button type="submit" variant="gold" style={{ marginTop: '8px' }}>
              Authenticate
            </Button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ color: 'var(--ok)', fontSize: '13px', fontWeight: 700 }}>
              ✓ Authenticated as Master Admin (INVICTORS@23)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                variant={isGlobalPaused.value ? 'gold' : 'danger'}
                onClick={handleTogglePause}
              >
                {isGlobalPaused.value ? '▶️ Resume All Clocks' : '⏸️ Global Emergency Pause'}
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  window.location.href = '/api/leaderboard';
                }}
              >
                📊 Raw JSON Leaderboard
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

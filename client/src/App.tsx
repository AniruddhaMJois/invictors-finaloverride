import { FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { LandingPage } from './pages/LandingPage';
import { GameDashboard } from './pages/GameDashboard';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPortal } from './pages/AdminPortal';
import { CoordinatorPortal } from './pages/CoordinatorPortal';
import { Modal, Input, Button } from './components/common/UI';
import {
  teamState,
  toasts,
  wsManager,
  syncServerTime,
  showToast
} from './store';

export const App: FunctionalComponent = () => {
  // Simple, lightweight URL router (Zero extra heavy libs)
  const [route, setRoute] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return '/admin';
    if (path.startsWith('/coordinator')) return '/coordinator';
    if (path.startsWith('/play')) return '/play';
    if (path.startsWith('/leaderboard')) return '/leaderboard';
    return '/';
  });

  // Admin Pin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [adminLockoutSeconds, setAdminLockoutSeconds] = useState(0);

  useEffect(() => {
    // Connect WebSocket
    wsManager.connect();
    // Sync Authoritative Time
    syncServerTime();

    // Check if team cookie already exists & restore state (if not on admin/coordinator)
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/admin') && !currentPath.startsWith('/coordinator')) {
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
    }

    // Handle Browser Popstate
    function onPopState() {
      const p = window.location.pathname;
      if (p.startsWith('/admin')) setRoute('/admin');
      else if (p.startsWith('/coordinator')) setRoute('/coordinator');
      else if (p.startsWith('/play')) setRoute('/play');
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

  // Lockout countdown timer
  useEffect(() => {
    if (adminLockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setAdminLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [adminLockoutSeconds]);

  function navigate(to: string) {
    window.history.pushState({}, '', to);
    setRoute(to);
  }

  // Admin Verification
  async function handleAdminLogin(e?: Event) {
    if (e) e.preventDefault();
    if (adminLockoutSeconds > 0) return;
    setAdminError('');
    setIsShaking(false);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        setShowAdminModal(false);
        setAdminPin('');
        showToast('Master Admin Authenticated! 🔐', 'gold');
        navigate('/admin');
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        setAdminError(data.error || 'Wrong PIN');
        if (data.remainingSeconds) {
          setAdminLockoutSeconds(data.remainingSeconds);
        }
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
      {route === '/admin' ? (
        <AdminPortal
          onLogout={() => {
            fetch('/api/admin/logout', { method: 'POST' });
            navigate('/');
          }}
          onNavigateHome={() => navigate('/')}
        />
      ) : route === '/coordinator' ? (
        <CoordinatorPortal onNavigateHome={() => navigate('/')} />
      ) : route === '/play' ? (
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
          onAdminClick={() => setShowAdminModal(true)}
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
        title="🔐 Master Organiser Access"
      >
        <form onSubmit={handleAdminLogin} className={isShaking ? 'animate-shake' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Enter Master Admin PIN to open live organizer dashboard.
          </p>
          <Input
            type="password"
            value={adminPin}
            onInput={(e: any) => setAdminPin(e.target.value)}
            placeholder="Enter PIN (INVICTORS@23)"
            disabled={adminLockoutSeconds > 0}
            autoFocus
          />
          {adminError && <div style={{ color: 'var(--bad)', fontSize: '12px' }}>⚠️ {adminError}</div>}

          {adminLockoutSeconds > 0 && (
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
              ⏳ Authentication locked for <strong>{adminLockoutSeconds}s</strong> due to 5 failed attempts.
            </div>
          )}

          <Button
            type="submit"
            variant="gold"
            disabled={adminLockoutSeconds > 0}
            style={{ marginTop: '8px' }}
          >
            Authenticate & Open Portal
          </Button>
        </form>
      </Modal>
    </div>
  );
};

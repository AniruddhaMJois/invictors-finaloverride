import { FunctionalComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { LeaderboardEntry } from '../../../shared/types';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Card, Button } from '../components/common/UI';
import { leaderboardData } from '../store';

interface LeaderboardPageProps {
  onBackToGame: () => void;
}

export const LeaderboardPage: FunctionalComponent<LeaderboardPageProps> = ({ onBackToGame }) => {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    // Check ?tv=1 query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('tv') === '1') {
      setIsTvMode(true);
    }

    // Fetch initial leaderboard
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) {
          leaderboardData.value = data.leaderboard;
        }
      })
      .catch((err) => console.error('Leaderboard Fetch Error:', err));
  }, []);

  const entries = leaderboardData.value;

  const fmtMinSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: isTvMode ? '#01040a' : 'var(--bg)'
      }}
    >
      <Header compact={!isTvMode} />

      <main
        style={{
          flex: 1,
          maxWidth: isTvMode ? '1600px' : '1080px',
          margin: '0 auto',
          padding: isTvMode ? '32px 24px' : '20px 16px',
          width: '100%'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isTvMode ? '36px' : '24px',
                fontWeight: 900,
                background: 'var(--grad-title)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              🏆 OFFICIAL LIVE LEADERBOARD
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
              Real-time standings · Updates live via WebSocket
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="ghost"
              onClick={() => setIsTvMode(!isTvMode)}
              style={{ fontSize: '12px' }}
            >
              {isTvMode ? 'Normal View' : '📺 Big Screen (TV Mode)'}
            </Button>
            <Button variant="gold" onClick={onBackToGame} style={{ fontSize: '12px' }}>
              ← Return to Mission
            </Button>
          </div>
        </div>

        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: isTvMode ? '18px' : '14px'
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--line)',
                    color: 'var(--cyan)',
                    fontSize: isTvMode ? '14px' : '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '80px' }}>Rank</th>
                  <th style={{ padding: '12px 14px' }}>Squad Name</th>
                  <th style={{ padding: '12px 14px' }}>Coordinator</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Progress</th>
                  <th style={{ padding: '12px 14px' }}>Total Time</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                      No squads have registered yet. Standings will appear as teams begin their missions.
                    </td>
                  </tr>
                ) : (
                  entries.map((team, idx) => {
                    const isTop3 = team.rank <= 3;
                    const rankMedal =
                      team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `#${team.rank}`;

                    return (
                      <tr
                        key={team.teamId}
                        style={{
                          borderBottom: '1px solid rgba(29, 79, 143, 0.4)',
                          background:
                            idx % 2 === 0
                              ? 'transparent'
                              : 'rgba(6, 18, 38, 0.5)',
                          transition: 'transform 0.3s ease, background 0.2s'
                        }}
                      >
                        {/* Rank */}
                        <td
                          style={{
                            padding: isTvMode ? '16px 14px' : '12px 14px',
                            fontWeight: 800,
                            color: isTop3 ? 'var(--gold)' : 'var(--muted)',
                            fontSize: isTvMode ? '22px' : '16px'
                          }}
                        >
                          {rankMedal}
                        </td>

                        {/* Squad Name */}
                        <td
                          style={{
                            padding: isTvMode ? '16px 14px' : '12px 14px',
                            fontWeight: 700,
                            color: 'var(--txt)'
                          }}
                        >
                          {team.teamName}
                        </td>

                        {/* Coordinator */}
                        <td
                          style={{
                            padding: isTvMode ? '16px 14px' : '12px 14px',
                            color: 'var(--muted)',
                            fontSize: isTvMode ? '15px' : '12px'
                          }}
                        >
                          {team.coordinator}
                        </td>

                        {/* Progress Bar (n/6) */}
                        <td style={{ padding: isTvMode ? '16px 14px' : '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '8px',
                                background: 'var(--bg2)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid var(--line)'
                              }}
                            >
                              <div
                                style={{
                                  width: `${(team.isCompleted ? 6 : team.currentStage - 1) * (100 / 6)}%`,
                                  height: '100%',
                                  background: team.isCompleted
                                    ? 'var(--ok)'
                                    : 'linear-gradient(90deg, var(--accent), var(--gold))',
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: team.isCompleted ? 'var(--ok)' : 'var(--cyan)'
                              }}
                            >
                              {team.isCompleted ? '6/6' : `${team.currentStage}/6`}
                            </span>
                          </div>
                        </td>

                        {/* Time */}
                        <td
                          style={{
                            padding: isTvMode ? '16px 14px' : '12px 14px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: team.isCompleted ? 'var(--gold)' : 'var(--txt)'
                          }}
                        >
                          {fmtMinSec(team.finalRankTimeSeconds)}
                          {team.penaltySeconds > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--bad)', marginLeft: '4px' }}>
                              (+{Math.round(team.penaltySeconds / 60)}m)
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td
                          style={{
                            padding: isTvMode ? '16px 14px' : '12px 14px',
                            textAlign: 'right'
                          }}
                        >
                          {team.isCompleted ? (
                            <span className="badge badge-ok">🏆 OVERRIDDEN</span>
                          ) : (
                            <span className="badge badge-gold">⚡ IN PROGRESS</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Footer compact />
    </div>
  );
};

import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const SET_STAGE1_SECTORS: Record<string, any[]> = {
  A: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['—', '•'], audioUrl: '/api/stage/1/assets/sector1_oscilloscope_N.mp3', caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['—', '—', '—'], telemetryBlock: '111-111-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['•', '•', '•', '—'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], audioUrl: '/api/stage/1/assets/sector4_satellite_A.mp3', caption: 'Short = •   Long = —' }
  ],
  B: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['•', '—', '•', '•'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•', '•', '—'], telemetryBlock: '1-1-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], caption: 'Short = •   Long = —' }
  ],
  C: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['•', '•', '•', '—'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•'], telemetryBlock: '1', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['—', '—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], caption: 'Short = •   Long = —' }
  ],
  D: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['—', '—'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•', '—'], telemetryBlock: '1-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['•', '—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '•', '•'], caption: 'Short = •   Long = —' }
  ]
};

export async function GET(request: Request) {
  await ensureInitialized();
  const session = await getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  if (!gameEngine.teams.has(session.teamId)) {
    await gameEngine.loadTeamFromDb(session.teamId);
  }

  const team = gameEngine.teams.get(session.teamId);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  if (team.currentStage !== 1) {
    return NextResponse.json(
      { error: 'Stage 1 content and assets are only accessible while on Stage 1.' },
      { status: 403 }
    );
  }

  const assignedSet = team.setId || 'A';
  const sectors = SET_STAGE1_SECTORS[assignedSet] || SET_STAGE1_SECTORS.A;
  const pad = gameEngine.getStagePad(session.teamId, 1);

  return NextResponse.json({
    stage: 1,
    name: 'Signal Intercept',
    heading: '📡 Stage 1: Signal Intercept',
    story:
      '📖 The story: Your squad has intercepted 4 sectors of the vault’s communication grid! 📡 Each sector hides one letter in Morse code (• = short, — = long). Decode them in order, Sector 1 to 4, to reveal the secret cosmic word.',
    footerLine:
      '✍️ Write the 4 letters in order (Sector 1 → 4) as one word, then type it below and press Submit.',
    timing: {
      unit: 0.22,
      dot: 0.22,
      dash: 0.66,
      gap: 0.22,
      leadIn: 0.2
    },
    sectors,
    pad
  });
}

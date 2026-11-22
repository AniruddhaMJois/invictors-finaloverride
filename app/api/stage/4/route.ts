import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const ACCESS_LOGS = [
  { time: '08:02', user: 'a.rao', door: 'Lab-1', status: 'GRANTED', clearance: 'L2' },
  { time: '08:07', user: 'm.kumar', door: 'Lab-2', status: 'GRANTED', clearance: 'L3' },
  { time: '08:15', user: 's.nair', door: 'Vault Gate', status: 'GRANTED', clearance: 'L4' },
  { time: '08:21', user: 'r.iyer', door: 'Lab-1', status: 'GRANTED', clearance: 'L2' },
  { time: '08:34', user: 'unknown', door: 'Vault Gate', status: 'DENIED', clearance: 'L9' },
  { time: '08:40', user: 'p.shetty', door: 'Lab-3', status: 'GRANTED', clearance: 'L3' },
  { time: '08:46', user: 'd.gowda', door: 'Lab-2', status: 'GRANTED', clearance: 'L2' },
  { time: '08:53', user: 'k.bhat', door: 'Vault Gate', status: 'GRANTED', clearance: 'L4' },
  { time: '09:01', user: 't.menon', door: 'Lab-1', status: 'GRANTED', clearance: 'L3' },
  { time: '09:10', user: 'v.hegde', door: 'Lab-3', status: 'GRANTED', clearance: 'L2' }
];

const SYMBOL_LEGEND = [
  { shape: 'triangle', letter: 'X' },
  { shape: 'circle', letter: 'O' },
  { shape: 'square', letter: 'K' },
  { shape: 'star', letter: 'S' },
  { shape: 'diamond', letter: 'D' },
  { shape: 'pentagon', letter: 'G' }
];

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  const team = gameEngine.teams.get(session.teamId);
  if (!team || team.currentStage !== 4) {
    return NextResponse.json(
      { error: 'Stage 4 content and stations are only accessible while on Stage 4.' },
      { status: 403 }
    );
  }

  const solvedStations = gameEngine.getStage4SolvedStations(session.teamId);

  return NextResponse.json({
    stage: 4,
    name: 'CTF Challenges',
    heading: '🚩 Stage 4: CTF Challenges',
    subtitle: '🛡️ Security Control Room',
    story:
      '📖 The story: The intruder slipped through the vault gateway! 🚨 Check the 3 security stations, find the hidden character at each one, and join them in order (Station 1 + 2 + 3) to lock the gateway again.',
    tip: '🧑🤝🧑 Tip: split the stations between your teammates and share what you find!',
    footerLine:
      '✍️ When all 3 stations show ✅, join the 3 characters in order and type them below.',
    solvedStations,
    station1: {
      id: 1,
      title: '📋 Access Log',
      subtitle: 'Find the intruder',
      instruction:
        'Every door entry is GRANTED except one. Read the clearance digit of the suspicious row.',
      logs: ACCESS_LOGS
    },
    station2: {
      id: 2,
      title: '🔦 Dark Camera Feed',
      subtitle: 'Light up the footage',
      instruction: 'Camera 4 is almost black. Slide the brightness up to see what is hidden.',
      imageUrl: '/api/stage/4/camera.png'
    },
    station3: {
      id: 3,
      title: '🔣 Symbol Keypad',
      subtitle: 'Read the symbol',
      instruction: 'Use the legend to turn the symbol on the keypad into a letter.',
      legend: SYMBOL_LEGEND,
      activeSymbol: 'triangle'
    }
  });
}

import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const ACCESS_LOGS = [
  { time: '08:02', user: 'a.rao', door: 'Lab-1', status: 'GRANTED', clearance: 'L1' },
  { time: '08:07', user: 'm.kumar', door: 'Lab-2', status: 'GRANTED', clearance: 'L4' },
  { time: '08:15', user: 's.nair', door: 'Vault Gate', status: 'GRANTED', clearance: 'L8' },
  { time: '08:21', user: 'r.iyer', door: 'Lab-1', status: 'GRANTED', clearance: 'L5' },
  { time: '08:34', user: 'unknown', door: 'Vault Gate', status: 'DENIED', clearance: 'L3' },
  { time: '08:40', user: 'p.shetty', door: 'Lab-3', status: 'GRANTED', clearance: 'L1' },
  { time: '08:46', user: 'd.gowda', door: 'Lab-2', status: 'GRANTED', clearance: 'L4' },
  { time: '08:53', user: 'k.bhat', door: 'Vault Gate', status: 'GRANTED', clearance: 'L8' },
  { time: '09:01', user: 't.menon', door: 'Lab-1', status: 'GRANTED', clearance: 'L5' },
  { time: '09:10', user: 'v.hegde', door: 'Lab-3', status: 'GRANTED', clearance: 'L1' }
];

const SYMBOL_LEGEND = [
  { shape: 'triangle', letter: 'X' },
  { shape: 'circle', letter: 'O' },
  { shape: 'square', letter: 'K' },
  { shape: 'star', letter: 'S' },
  { shape: 'diamond', letter: 'D' },
  { shape: 'pentagon', letter: 'G' }
];

const SET_STATION_DATA: Record<string, { s1Clearance: string; activeSymbol: string; legend: Array<{ shape: string; letter: string }> }> = {
  A: {
    s1Clearance: 'L3',
    activeSymbol: 'triangle',
    legend: [
      { shape: 'triangle', letter: 'X' },
      { shape: 'circle', letter: 'O' },
      { shape: 'square', letter: 'K' },
      { shape: 'star', letter: 'S' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'G' }
    ]
  },
  B: {
    s1Clearance: 'L7',
    activeSymbol: 'star',
    legend: [
      { shape: 'star', letter: 'Z' },
      { shape: 'triangle', letter: 'A' },
      { shape: 'circle', letter: 'B' },
      { shape: 'square', letter: 'C' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'E' }
    ]
  },
  C: {
    s1Clearance: 'L9',
    activeSymbol: 'diamond',
    legend: [
      { shape: 'diamond', letter: 'Y' },
      { shape: 'triangle', letter: 'F' },
      { shape: 'circle', letter: 'G' },
      { shape: 'square', letter: 'H' },
      { shape: 'star', letter: 'I' },
      { shape: 'pentagon', letter: 'J' }
    ]
  },
  D: {
    s1Clearance: 'L2',
    activeSymbol: 'square',
    legend: [
      { shape: 'square', letter: 'K' },
      { shape: 'triangle', letter: 'L' },
      { shape: 'circle', letter: 'M' },
      { shape: 'star', letter: 'N' },
      { shape: 'diamond', letter: 'P' },
      { shape: 'pentagon', letter: 'Q' }
    ]
  },
  E: {
    s1Clearance: 'L6',
    activeSymbol: 'circle',
    legend: [
      { shape: 'circle', letter: 'W' },
      { shape: 'triangle', letter: 'R' },
      { shape: 'square', letter: 'T' },
      { shape: 'star', letter: 'U' },
      { shape: 'diamond', letter: 'V' },
      { shape: 'pentagon', letter: 'Y' }
    ]
  }
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

  const assignedSet = team.setId || 'A';
  const setCfg = SET_STATION_DATA[assignedSet] || SET_STATION_DATA.A;
  const solvedStations = gameEngine.getStage4SolvedStations(session.teamId);

  const dynamicLogs = ACCESS_LOGS.map((log) =>
    log.user === 'unknown' ? { ...log, clearance: setCfg.s1Clearance } : log
  );

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
      logs: dynamicLogs
    },
    station2: {
      id: 2,
      title: '🔦 Dark Camera Feed',
      subtitle: 'Light up the footage',
      instruction: 'Camera 4 is almost black. Slide the brightness up to see what is hidden.',
      imageUrl: `/api/stage/4/camera.png?set=${assignedSet}`
    },
    station3: {
      id: 3,
      title: '🔣 Symbol Keypad',
      subtitle: 'Read the symbol',
      instruction: 'Use the legend to turn the symbol on the keypad into a letter.',
      legend: setCfg.legend,
      activeSymbol: setCfg.activeSymbol
    }
  });
}

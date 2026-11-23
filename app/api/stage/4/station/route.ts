import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SET_STATION_ANSWERS: Record<string, Record<number, string>> = {
  A: { 1: '9', 2: '1', 3: 'X' },
  B: { 1: '8', 2: '4', 3: 'Z' },
  C: { 1: '7', 2: '2', 3: 'Y' },
  D: { 1: '6', 2: '3', 3: 'K' },
  E: { 1: '5', 2: '7', 3: 'W' }
};

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const session = await getTeamSession(request);
    const body = await request.json();
    const { n, value, set } = body;
    const num = parseInt(n, 10);
    const val = (value || '').toString().trim().toUpperCase();

    if (session) {
      if (!gameEngine.teams.has(session.teamId)) {
        await gameEngine.loadTeamFromDb(session.teamId);
      }

      const team = gameEngine.teams.get(session.teamId);
      if (team) {
        const result = await gameEngine.checkStage4Station(session.teamId, num, val);
        return NextResponse.json(result);
      }
    }

    // Standalone / fallback validation
    const assignedSet = ((set || 'A') as string).toUpperCase();
    const map = SET_STATION_ANSWERS[assignedSet] || SET_STATION_ANSWERS.A;
    const isCorrect = val === map[num];

    if (isCorrect) {
      return NextResponse.json({
        ok: true,
        station: num,
        solvedStations: [num],
        allSolved: false
      });
    } else {
      return NextResponse.json({
        ok: false,
        station: num,
        message: 'Not quite, look again. 🙂',
        attempts: 1
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

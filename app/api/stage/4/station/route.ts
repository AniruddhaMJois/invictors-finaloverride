import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { n, value } = body;

    const result = await gameEngine.checkStage4Station(session.teamId, n, value);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

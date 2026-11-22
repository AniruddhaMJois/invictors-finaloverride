import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { n, value } = body;

    const result = await gameEngine.checkStage4Station(session.teamId, n, value);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

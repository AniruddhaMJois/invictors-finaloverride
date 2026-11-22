import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = await getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  await gameEngine.loadTeamFromDb(session.teamId);

  const state = gameEngine.getClientTeamState(session.teamId);
  if (!state) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  return NextResponse.json(state);
}

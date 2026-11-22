import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getCoordinatorSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getCoordinatorSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Coordinator authentication required.' }, { status: 401 });
  }

  const teams = gameEngine.getCoordinatorTeams(session.coordinator);
  return NextResponse.json({
    coordinator: session.coordinator,
    teams
  });
}

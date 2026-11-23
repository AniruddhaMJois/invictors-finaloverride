import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
  }
  await gameEngine.syncAllTeamsFromDb();
  return NextResponse.json({ teams: gameEngine.getAdminTeams() });
}

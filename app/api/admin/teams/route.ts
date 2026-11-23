import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureInitialized();
  } catch (err: any) {
    console.warn('ensureInitialized warning in /api/admin/teams:', err?.message);
  }

  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
  }

  try {
    await gameEngine.syncAllTeamsFromDb();
  } catch (err: any) {
    console.warn('syncAllTeamsFromDb warning in /api/admin/teams:', err?.message);
  }

  return NextResponse.json({ teams: gameEngine.getAdminTeams() });
}

import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    await ensureInitialized();
    const session = await getTeamSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
    }

    if (!gameEngine.teams.has(session.teamId)) {
      await gameEngine.loadTeamFromDb(session.teamId);
    }

    const body = await request.json();
    const { text } = body;

    await gameEngine.saveNotes(session.teamId, text || '');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

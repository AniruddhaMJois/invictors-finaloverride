import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getCoordinatorSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const session = getCoordinatorSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Coordinator authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, message } = body;

    let validTeamId = null;
    if (teamId) {
      const t = gameEngine.teams.get(parseInt(teamId, 10));
      if (t && t.coordinator.toLowerCase() === session.coordinator.toLowerCase()) {
        validTeamId = t.id;
      }
    }

    const alert = await gameEngine.addCoordinatorAlert({
      coordinator: session.coordinator,
      teamId: validTeamId,
      message
    });

    return NextResponse.json({ success: true, alert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

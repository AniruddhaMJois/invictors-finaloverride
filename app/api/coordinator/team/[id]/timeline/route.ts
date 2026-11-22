import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getCoordinatorSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();
    const session = getCoordinatorSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Coordinator authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);
    const team = gameEngine.teams.get(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.coordinator.toLowerCase() !== session.coordinator.toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to squads assigned to other coordinators.' },
        { status: 403 }
      );
    }

    const timeline = await gameEngine.getTeamTimeline(teamId);
    return NextResponse.json(timeline);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { stage, answer } = body;

    const result = await gameEngine.submitAnswer(session.teamId, parseInt(stage, 10), answer);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 400 });
  }
}

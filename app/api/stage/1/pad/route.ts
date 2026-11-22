import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  const team = gameEngine.teams.get(session.teamId);
  if (!team || team.currentStage !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pad = gameEngine.getStagePad(session.teamId, 1);
  return NextResponse.json({ pad });
}

export async function PUT(request: Request) {
  try {
    await ensureInitialized();
    const session = getTeamSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
    }

    const team = gameEngine.teams.get(session.teamId);
    if (!team || team.currentStage !== 1) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const cleanPad = {
      s1: String(body.pad?.s1 || '').substring(0, 4).toUpperCase(),
      s2: String(body.pad?.s2 || '').substring(0, 4).toUpperCase(),
      s3: String(body.pad?.s3 || '').substring(0, 4).toUpperCase(),
      s4: String(body.pad?.s4 || '').substring(0, 4).toUpperCase()
    };

    await gameEngine.saveStagePad(session.teamId, 1, cleanPad);
    return NextResponse.json({ success: true, pad: cleanPad });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

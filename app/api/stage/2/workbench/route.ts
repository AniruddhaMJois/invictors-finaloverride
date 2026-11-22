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

    const team = gameEngine.teams.get(session.teamId);
    if (!team || team.currentStage !== 2) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { currentText, history } = body;

    if (typeof currentText !== 'string' || currentText.length > 20000) {
      return NextResponse.json({ error: 'Invalid currentText buffer.' }, { status: 400 });
    }

    if (!Array.isArray(history) || history.length > 100) {
      return NextResponse.json({ error: 'Invalid history stack.' }, { status: 400 });
    }

    const cleanHistory = history.map((item: any) => ({
      tool: String(item.tool || '').slice(0, 50),
      beforePreview: String(item.beforePreview || '').slice(0, 60),
      afterPreview: String(item.afterPreview || '').slice(0, 60),
      previousText: typeof item.previousText === 'string' ? item.previousText.slice(0, 20000) : ''
    }));

    await gameEngine.saveStageWorkbench(session.teamId, 2, {
      currentText,
      history: cleanHistory
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

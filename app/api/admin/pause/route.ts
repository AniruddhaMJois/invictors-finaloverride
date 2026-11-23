import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    await gameEngine.togglePause(Boolean(body.pause));
    await gameEngine.logAudit('Admin', 'pause_toggle', JSON.stringify({ paused: gameEngine.globalPaused }));
    return NextResponse.json({ paused: gameEngine.globalPaused });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
  }
  const url = new URL(request.url);
  const setParam = url.searchParams.get('set');
  const sId = (setParam || 'A').toUpperCase();

  // Always query fresh, ground-truth hints directly from Supabase PostgreSQL
  const liveHints = await gameEngine.getLiveDbHints(sId);

  return NextResponse.json({
    success: true,
    hints: liveHints,
    allHints: gameEngine.getAllHints(),
    currentSet: sId
  });
}

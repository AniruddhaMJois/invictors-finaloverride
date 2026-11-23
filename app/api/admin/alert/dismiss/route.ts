import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
  }

  const body = await request.json();
  if (body.alertId) {
    gameEngine.dismissAdminAlert(body.alertId);
  }
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { CONFIG } from '@/server/config/index.js';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureInitialized();
  return NextResponse.json({
    serverNow: Date.now(),
    isPaused: gameEngine.globalPaused,
    timeCapSeconds: CONFIG.TIME_CAP_SECONDS
  });
}

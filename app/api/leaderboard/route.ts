import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureInitialized();
  return NextResponse.json({
    leaderboard: gameEngine.getLeaderboard(),
    serverNow: Date.now()
  });
}

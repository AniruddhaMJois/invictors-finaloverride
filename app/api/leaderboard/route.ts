import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  await ensureInitialized();
  await gameEngine.loadFromDb();
  return NextResponse.json({
    leaderboard: gameEngine.getLeaderboard(),
    serverNow: Date.now()
  });
}

import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    await ensureInitialized();
    const waitlist = await gameEngine.getWaitlist();
    return NextResponse.json({
      gameStarted: gameEngine.gameStarted,
      totalWaiting: waitlist.filter((w) => !w.isCompleted && w.currentStage === 1).length,
      totalTeams: waitlist.length,
      waitlist
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

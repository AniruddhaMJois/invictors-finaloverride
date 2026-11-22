import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
    }

    const result = await gameEngine.wipeAllTeams('Master Admin');
    return NextResponse.json({
      success: true,
      message: 'All teams successfully wiped from system.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

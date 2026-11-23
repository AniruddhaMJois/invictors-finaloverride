import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const body = await request.json();
    const { teamName, memberName } = body;

    const { team, token } = await gameEngine.resumeTeam({ teamName, memberName });

    const response = NextResponse.json({
      success: true,
      token,
      state: gameEngine.getClientTeamState(team.id)
    });

    response.cookies.set('device_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

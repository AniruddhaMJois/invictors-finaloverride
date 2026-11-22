import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const body = await request.json();
    const { teamName, coordinator, members } = body;

    const { team, token } = await gameEngine.registerTeam({ teamName, coordinator, members });

    const response = NextResponse.json(
      {
        success: true,
        token,
        state: gameEngine.getClientTeamState(team.id)
      },
      { status: 201 }
    );

    response.cookies.set('device_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (err: any) {
    let msg = err.message || 'Failed to register squad.';
    if (
      msg.includes('unique constraint') ||
      msg.includes('duplicate key') ||
      msg.includes('teams_name_key')
    ) {
      msg = 'Squad name is already taken. Please choose a different name or use Squad Resume.';
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

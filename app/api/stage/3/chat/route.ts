import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const session = getTeamSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
    }

    const team = gameEngine.teams.get(session.teamId);
    if (!team || team.currentStage !== 3) {
      return NextResponse.json(
        { error: 'Stage 3 content and WARDEN console are only accessible while on Stage 3.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    if (message.length > 400) {
      return NextResponse.json({ error: 'Message cannot exceed 400 characters.' }, { status: 400 });
    }

    let memberName = 'Operator';
    const memberObj = team.members?.find((m: any) => m.id === session.memberId);
    if (memberObj) {
      memberName = memberObj.name;
    }

    const result = await gameEngine.addChatMessage(session.teamId, message.trim(), memberName);

    return NextResponse.json({
      success: true,
      reply: result.wardenMessage.text,
      userMessage: result.userMessage,
      wardenMessage: result.wardenMessage,
      history: result.history
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 });
  }
}

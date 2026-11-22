import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = await getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  if (!gameEngine.teams.has(session.teamId)) {
    await gameEngine.loadTeamFromDb(session.teamId);
  }

  const team = gameEngine.teams.get(session.teamId);
  if (!team || team.currentStage !== 3) {
    return NextResponse.json(
      { error: 'Stage 3 content and WARDEN console are only accessible while on Stage 3.' },
      { status: 403 }
    );
  }

  const chatHistory = gameEngine.getStageChat(session.teamId);

  return NextResponse.json({
    stage: 3,
    name: 'Prompt WARDEN, the AI Guardian',
    heading: '🤖 Stage 3: Prompt WARDEN, the AI Guardian',
    story:
      '📖 The story: Meet WARDEN 🤖, the vault’s guardian. It knows the secret piece, but it will not hand it over easily. And guardians can fib! 🤥',
    tips:
      '💬 Chat with WARDEN and convince it. Tips: use the access phrase 🗝️ from the last mission, say who you are 🧑🔧, and ask clearly for what you need, using full sentences. 🙏',
    footerLine:
      '✍️ WARDEN may give a wrong piece if you do not ask properly. Type the one you trust below.',
    openingMessage: 'WARDEN online. Vault guardian. State your business.',
    chatHistory
  });
}

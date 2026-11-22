import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getTeamVariant } from '@/shared/ciphers.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const ALL_STAGE2_TOOLS = [
  'Base64 Decode',
  'Hex Decode',
  'ROT13',
  'Atbash Mirror',
  'Reverse String',
  'ROT5',
  'Caesar +3',
  'Vigenère'
];

function getShuffledToolsForTeam(teamId: number) {
  const tools = [...ALL_STAGE2_TOOLS];
  let seed = ((Number(teamId) || 1) * 9301 + 49297) % 233280;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  for (let i = tools.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [tools[i], tools[j]] = [tools[j], tools[i]];
  }
  return tools;
}

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
  if (!team || team.currentStage !== 2) {
    return NextResponse.json(
      { error: 'Stage 2 content and workbench are only accessible while on Stage 2.' },
      { status: 403 }
    );
  }

  const variant = getTeamVariant(session.teamId, team?.setId);
  let workbench = gameEngine.getStageWorkbench(session.teamId, 2);

  if (!workbench) {
    workbench = {
      currentText: variant.payload,
      history: []
    };
  }

  return NextResponse.json({
    stage: 2,
    name: 'Multi-Layer Decryption Suite',
    heading: '🔓 Stage 2: Multi-Layer Decryption Suite',
    story:
      '📖 The story: The vault sent a second message, but it is wrapped in 3 scrambled layers, like a gift with 3 wrappers. 🎁 Unwrap one layer at a time, in the right order, to read the secret message.',
    footerLine:
      '✍️ The message tells you the secret piece. Type it below. 👉 Also remember the special access phrase in it: you will need it in the next mission! 🗝️',
    payload: variant.payload,
    tools: getShuffledToolsForTeam(session.teamId),
    workbench
  });
}

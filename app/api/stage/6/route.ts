import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYNTHESIS_MISSIONS = [
  { order: 1, stageId: 4, sortName: 'CTF Challenges', keyVar: 'f4', isReversed: false },
  { order: 2, stageId: 2, sortName: 'Decoding', keyVar: 'f2', isReversed: false },
  { order: 3, stageId: 5, sortName: 'Hex Decryption', keyVar: 'f5', isReversed: false },
  { order: 4, stageId: 3, sortName: 'Prompt the AI', keyVar: 'reverse(f3)', isReversed: true },
  { order: 5, stageId: 1, sortName: 'Signal Intercept', keyVar: 'f1', isReversed: false }
];

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
  if (!team || team.currentStage !== 6) {
    return NextResponse.json(
      { error: 'Stage 6 content and master override synthesis are only accessible while on Stage 6.' },
      { status: 403 }
    );
  }

  const missionsWithFragments = SYNTHESIS_MISSIONS.map((m) => {
    const rawFrag = (team && team.fragments && team.fragments[m.stageId]) || '';
    const activeFrag = m.isReversed ? rawFrag.split('').reverse().join('') : rawFrag;
    return {
      ...m,
      rawFragment: rawFrag,
      activeFragment: activeFrag
    };
  });

  return NextResponse.json({
    stage: 6,
    name: 'Final Integration & Master Override Synthesis',
    heading: '🧩 Stage 6: Final Integration & Master Override Synthesis',
    story:
      '📖 The story: All 5 security fragments have been recovered! 🧩 To forge the master override key, sort the 5 missions alphabetically by their official mission name. Reverse the AI Guardian fragment, calculate the digit checksum, and execute the final override!',
    tip: '💡 Tip: Format is FO{f4-f2-f5-reverse(f3)-f1}#<checksum>. The checksum is the sum of every single digit (0–9) appearing inside the curly braces.',
    footerLine:
      '✍️ Assemble the master key and submit below to initiate the final override.',
    missions: missionsWithFragments,
    keyFormat: 'FO{f4-f2-f5-reverse(f3)-f1}#<checksum>',
    collectedFragments: (team && team.fragments) || {}
  });
}

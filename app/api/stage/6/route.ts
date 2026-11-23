import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Chronological mission definitions (Stage 1 to 5) — does not leak solved order
const STAGE_MISSIONS = [
  { stageId: 1, missionName: 'Signal Intercept' },
  { stageId: 2, missionName: 'Decoding' },
  { stageId: 3, missionName: 'Prompt the AI' },
  { stageId: 4, missionName: 'CTF Challenges' },
  { stageId: 5, missionName: 'Hex Decryption' }
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

  const recoveredMissions = STAGE_MISSIONS.map((m) => {
    const rawFrag = (team && team.fragments && team.fragments[m.stageId]) || '';
    return {
      stageId: m.stageId,
      missionName: m.missionName,
      rawFragment: rawFrag
    };
  });

  return NextResponse.json({
    stage: 6,
    name: 'Final Integration & Master Override Synthesis',
    heading: '🧩 Stage 6: Final Integration & Master Override Synthesis',
    story:
      'All 5 security fragments have been recovered! To forge the master override key, synthesize your previous answers using the master protocol rules. Reverse the AI Guardian fragment, test combinations to establish the true sequence, calculate the digit checksum, and execute the final override!',
    tip: 'Skeleton Format: FO{<fragment>-<fragment>-<fragment>-<fragment>-<fragment>}#<checksum>. The checksum is the arithmetic sum of every single numeric digit (0–9) appearing inside the curly braces.',
    footerLine:
      '✍️ Assemble your candidate key inside the FO{} skeleton and submit below to initiate the final override.',
    missions: recoveredMissions,
    skeleton: 'FO{}',
    collectedFragments: (team && team.fragments) || {}
  });
}

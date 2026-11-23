import { NextResponse } from 'next/server';
import { STAGE_ANSWERS } from '@/server/config/index.js';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
  }

  await gameEngine.logAudit('Admin', 'inspect_keys', 'Master Admin inspected live answer keys and computed formulas');

  const finishedVerifications: any[] = [];
  for (const team of gameEngine.teams.values()) {
    if (team.isCompleted && team.verificationCode) {
      finishedVerifications.push({
        teamId: team.id,
        teamName: team.teamName,
        startTime: team.startTime,
        endTime: team.endTime,
        verificationCode: team.verificationCode
      });
    }
  }

  return NextResponse.json({
    staticAnswers: STAGE_ANSWERS,
    decoys: {
      1: ['FREQ-ZETA9'],
      2: ['AURORA', '7X2', 'ZETA9'],
      3: ['ZETA9', 'AURORA'],
      4: [],
      5: ['ZETA9'],
      6: []
    },
    stage2AccessPhrase: 'AURORA',
    stage4Stations: { 1: '9', 2: '1', 3: 'X' },
    stage5ExpectedKey: 'HEX82D',
    stage6SynthesisFormula: {
      alphabeticalOrder: [
        'CTF Challenges (Station 1-3) -> 91X',
        'Decoding (Multi-Layer) -> 7K2',
        'Hex Decryption (Memory Core) -> HEX82D',
        'Prompt the AI Guardian (Reversed) -> TIBRO',
        'Signal Intercept (Morse) -> NOVA'
      ],
      joinedBody: '91X-7K2-HEX82D-TIBRO-NOVA',
      checksumExplanation: 'Sum of all numeric digits in body: 9 + 1 + 7 + 2 + 8 + 2 = 29',
      masterKey: 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29'
    },
    finishedVerifications
  });
}

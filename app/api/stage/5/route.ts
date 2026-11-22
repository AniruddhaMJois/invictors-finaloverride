import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const SET_STAGE5_BYTES: Record<string, string[]> = {
  A: ['48', '45', '58', '38', '32', '44'], // HEX82D
  B: ['43', '4F', '52', '45', '37', '46'], // CORE7F
  C: ['42', '59', '54', '45', '39', '41'], // BYTE9A
  D: ['42', '49', '54', '53', '31', '45']  // BITS1E
};

const DUMMY_COLUMNS = [
  ['0A', 'F2', '1C'],
  ['9B', '7E', 'D0'],
  ['3F', 'A1', '64'],
  ['E5', '2B', '99'],
  ['71', '8C', '4A'],
  ['BD', '15', 'EE']
];

function getMemoryChannelsForSet(bytes: string[]) {
  const channelNames = ['Channel A', 'Channel B', 'Channel C', 'Channel D', 'Channel E', 'Channel F'];
  return channelNames.map((name, idx) => ({
    channel: name,
    bytes: [DUMMY_COLUMNS[idx][0], bytes[idx], DUMMY_COLUMNS[idx][1], DUMMY_COLUMNS[idx][2]],
    activeIndex: 1
  }));
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
  if (!team || team.currentStage !== 5) {
    return NextResponse.json(
      { error: 'Stage 5 content and memory core are only accessible while on Stage 5.' },
      { status: 403 }
    );
  }

  const assignedSet = team.setId || 'A';
  const activeBytes = SET_STAGE5_BYTES[assignedSet] || SET_STAGE5_BYTES.A;
  const channels = getMemoryChannelsForSet(activeBytes);

  return NextResponse.json({
    stage: 5,
    name: 'Hexadecimal Memory Core',
    heading: '🧠 Stage 5: Hexadecimal Memory Core & Bus Decoupler',
    story:
      '📖 The story: The vault’s memory core is pulsing with raw hexadecimal data! 🧠 Six high-frequency channels (A through F) are dumping 4-column registers. The decoupled active high-voltage data bus line runs along Column 1. Decouple it and translate the bytes into ASCII.',
    tip: '💡 Tip: Examine Column 1 across Channels A through F. Each byte represents an ASCII character in hexadecimal (0x48 -> H).',
    footerLine:
      '✍️ Decode the active bus line bytes into ASCII text and enter the fragment below.',
    activeColumnIndex: 1,
    activeBusBytes: activeBytes,
    channels
  });
}

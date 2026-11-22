import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { ensureInitialized } from '@/lib/server/init';
import { getTeamSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const MEMORY_CORE_CHANNELS = [
  { channel: 'Channel A', bytes: ['0A', '48', 'F2', '1C'], activeIndex: 1 },
  { channel: 'Channel B', bytes: ['9B', '45', '7E', 'D0'], activeIndex: 1 },
  { channel: 'Channel C', bytes: ['3F', '58', 'A1', '64'], activeIndex: 1 },
  { channel: 'Channel D', bytes: ['E5', '38', '2B', '99'], activeIndex: 1 },
  { channel: 'Channel E', bytes: ['71', '32', '8C', '4A'], activeIndex: 1 },
  { channel: 'Channel F', bytes: ['BD', '44', '15', 'EE'], activeIndex: 1 }
];

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getTeamSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Device token missing or expired.' }, { status: 401 });
  }

  const team = gameEngine.teams.get(session.teamId);
  if (!team || team.currentStage !== 5) {
    return NextResponse.json(
      { error: 'Stage 5 content and memory core are only accessible while on Stage 5.' },
      { status: 403 }
    );
  }

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
    activeBusBytes: ['48', '45', '58', '38', '32', '44'],
    channels: MEMORY_CORE_CHANNELS
  });
}

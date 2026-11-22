import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTeamSession } from '@/lib/server/auth';
import { gameEngine } from '@/server/services/gameEngine.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let setId = 'A';
  const url = new URL(request.url);
  const paramSet = url.searchParams.get('set');
  if (paramSet && ['A', 'B', 'C', 'D', 'E'].includes(paramSet.toUpperCase())) {
    setId = paramSet.toUpperCase();
  } else {
    try {
      const session = await getTeamSession(request);
      if (session) {
        const team = gameEngine.teams.get(session.teamId);
        if (team && team.setId) {
          setId = team.setId.toUpperCase();
        }
      }
    } catch {}
  }

  let filePath = path.join(process.cwd(), `public/assets/stage4/camera_${setId}.png`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'public/assets/stage4/camera.png');
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Camera image asset not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
}

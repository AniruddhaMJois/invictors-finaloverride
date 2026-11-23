import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTeamSession } from '@/lib/server/auth';
import { gameEngine } from '@/server/services/gameEngine.js';
import { createCameraPngBuffer } from '@/lib/server/cameraGenerator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SET_DIGITS: Record<string, string> = {
  A: '1',
  B: '4',
  C: '2',
  D: '3',
  E: '7'
};

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

  // 1. Try serving from public folder if present on disk
  try {
    let filePath = path.join(process.cwd(), `public/assets/stage4/camera_${setId}.png`);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public/assets/stage4/camera.png');
    }

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
      });
    }
  } catch {}

  // 2. Dynamic in-memory generation fallback (for serverless environments like Vercel)
  const digit = SET_DIGITS[setId] || '1';
  const dynamicBuffer = createCameraPngBuffer(digit);
  return new NextResponse(new Uint8Array(dynamicBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': dynamicBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}

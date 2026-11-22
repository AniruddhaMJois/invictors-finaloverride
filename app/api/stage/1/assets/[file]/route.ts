import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const allowed = ['sector1_oscilloscope_N.mp3', 'sector4_satellite_A.mp3'];

  if (!allowed.includes(file)) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'public/assets/stage1', file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Asset file missing' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
}

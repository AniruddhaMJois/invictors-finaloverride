import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public/assets/stage4/camera.png');
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

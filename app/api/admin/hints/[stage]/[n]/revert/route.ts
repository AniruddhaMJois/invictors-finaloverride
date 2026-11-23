import { NextResponse } from 'next/server';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stage: string; n: string }> }
) {
  try {
    await ensureInitialized();
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Master Admin authentication required.' }, { status: 401 });
    }

    const { stage, n } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}
    const url = new URL(request.url);
    const sId = (body.setId || url.searchParams.get('set') || 'A').toUpperCase();
    const hints = await gameEngine.revertHint(stage, n, 'Admin', sId);
    return NextResponse.json({ success: true, hints, setId: sId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

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
    const hints = await gameEngine.revertHint(stage, n, 'Admin');
    return NextResponse.json({ success: true, hints });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

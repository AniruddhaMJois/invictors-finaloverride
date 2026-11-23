import { NextResponse } from 'next/server';
import { CONFIG } from '@/server/config/index.js';
import { gameEngine } from '@/server/services/gameEngine.js';
import {
  createAdminToken,
  checkAdminLockout,
  recordAdminAttempt
} from '@/server/services/auth.js';
import { ensureInitialized } from '@/lib/server/init';
import { getClientIp } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await ensureInitialized();
  const ip = getClientIp(request);
  const lockout = checkAdminLockout(ip);
  if (lockout.locked) {
    return NextResponse.json(
      {
        error: `Too many wrong PIN attempts. Access locked for ${lockout.remainingSeconds} seconds.`,
        remainingSeconds: lockout.remainingSeconds
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { pin } = body;

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    recordAdminAttempt(ip, false);
    const updated = checkAdminLockout(ip);
    if (updated.locked) {
      return NextResponse.json(
        {
          error: `Too many wrong PIN attempts. Access locked for ${updated.remainingSeconds} seconds.`,
          remainingSeconds: updated.remainingSeconds
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Wrong PIN. Access denied.' }, { status: 401 });
  }

  recordAdminAttempt(ip, true);
  const token = createAdminToken();

  await gameEngine.logAudit('Admin', 'login', 'Master Admin authenticated successfully');

  const response = NextResponse.json({
    success: true,
    token
  });

  response.cookies.set('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60,
    path: '/'
  });

  return response;
}

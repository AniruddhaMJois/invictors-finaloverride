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
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await ensureInitialized();
  } catch (err: any) {
    console.warn('ensureInitialized warning in /api/admin/login:', err?.message);
  }

  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  const cleanInput = (pin || '').trim();
  const rawExpected = (CONFIG.ADMIN_PIN || 'INVICTORS@23').trim();
  const cleanExpected = rawExpected.replace(/^["']|["']$/g, '').trim();

  const isMatch =
    cleanInput === cleanExpected ||
    cleanInput.toUpperCase() === cleanExpected.toUpperCase();

  const lockout = checkAdminLockout(ip);
  if (lockout.locked) {
    if (isMatch) {
      recordAdminAttempt(ip, true);
    } else {
      return NextResponse.json(
        {
          error: `Too many wrong PIN attempts. Access locked for ${lockout.remainingSeconds} seconds.`,
          remainingSeconds: lockout.remainingSeconds
        },
        { status: 429 }
      );
    }
  }

  if (!cleanInput || !isMatch) {
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

  try {
    await gameEngine.logAudit('Admin', 'login', 'Master Admin authenticated successfully');
  } catch {}

  const response = NextResponse.json({
    success: true,
    token
  });

  response.cookies.set('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 4 * 60 * 60,
    path: '/'
  });

  return response;
}

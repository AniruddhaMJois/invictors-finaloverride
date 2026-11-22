import { NextResponse } from 'next/server';
import { CONFIG } from '@/server/config/index.js';
import { gameEngine } from '@/server/services/gameEngine.js';
import {
  createCoordinatorToken,
  checkCoordinatorLockout,
  recordCoordinatorAttempt
} from '@/server/services/auth.js';
import { ensureInitialized } from '@/lib/server/init';
import { getClientIp } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await ensureInitialized();
  const ip = getClientIp(request);
  const lockout = checkCoordinatorLockout(ip);
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
  const { name, pin } = body;
  const cleanName = (name || '').trim().toLowerCase();
  const cleanPin = (pin || '').trim();

  const found = CONFIG.COORDINATORS.find(
    (c: any) => c.name.toLowerCase() === cleanName && c.pin === cleanPin
  );

  if (!found) {
    recordCoordinatorAttempt(ip, false);
    const updated = checkCoordinatorLockout(ip);
    if (updated.locked) {
      return NextResponse.json(
        {
          error: `Too many wrong PIN attempts. Access locked for ${updated.remainingSeconds} seconds.`,
          remainingSeconds: updated.remainingSeconds
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: 'Invalid Coordinator Name or PIN.' }, { status: 401 });
  }

  recordCoordinatorAttempt(ip, true);
  const token = createCoordinatorToken(found.name);

  await gameEngine.logAudit(`Coordinator: ${found.name}`, 'login', 'Coordinator authenticated');

  const response = NextResponse.json({
    success: true,
    coordinator: found.name,
    token
  });

  response.cookies.set('coord_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60,
    path: '/'
  });

  return response;
}

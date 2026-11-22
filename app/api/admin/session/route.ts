import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role: 'admin' });
}

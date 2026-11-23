import { gameEngine } from '@/server/services/gameEngine.js';
import { verifyAdminToken, verifyCoordinatorToken } from '@/server/services/auth.js';

export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  return cookies;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'global';
}

export async function getTeamSession(request: Request) {
  const cookies = parseCookies(request);
  const authHeader = request.headers.get('authorization') || '';
  const token = cookies.device_token || authHeader.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  const session = await gameEngine.verifyDeviceToken(token);
  if (!session) return null;

  return {
    teamId: session.teamId,
    memberId: session.memberId,
    token
  };
}

export function getAdminSession(request: Request) {
  const cookies = parseCookies(request);
  const authHeader = request.headers.get('authorization') || '';
  const token = cookies.admin_token || authHeader.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyAdminToken(token);
}

export function getCoordinatorSession(request: Request) {
  const cookies = parseCookies(request);
  const authHeader = request.headers.get('authorization') || '';
  const token = cookies.coord_token || authHeader.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyCoordinatorToken(token);
}

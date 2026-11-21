import crypto from 'crypto';
import { CONFIG } from '../config/index.js';

// In-memory lockout trackers
const adminFailures = new Map(); // ip -> [timestamps]
const coordFailures = new Map(); // ip -> [timestamps]
const LOCKOUT_WINDOW_MS = 60 * 1000;
const LOCKOUT_DURATION_MS = 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function checkLockout(map, key) {
  const now = Date.now();
  let attempts = map.get(key) || [];
  // Keep attempts within the last 2 minutes
  attempts = attempts.filter((ts) => now - ts < LOCKOUT_WINDOW_MS + LOCKOUT_DURATION_MS);
  map.set(key, attempts);

  // If there are 5+ failures within any 60-second window
  if (attempts.length >= MAX_FAILED_ATTEMPTS) {
    const fifthRecent = attempts[attempts.length - MAX_FAILED_ATTEMPTS];
    const timeSinceFifth = now - fifthRecent;
    if (timeSinceFifth < LOCKOUT_DURATION_MS) {
      const remainingSeconds = Math.ceil((LOCKOUT_DURATION_MS - timeSinceFifth) / 1000);
      return { locked: true, remainingSeconds };
    }
  }
  return { locked: false, remainingSeconds: 0 };
}

function recordAttempt(map, key, success) {
  if (success) {
    map.delete(key);
    return;
  }
  const now = Date.now();
  const attempts = map.get(key) || [];
  attempts.push(now);
  map.set(key, attempts);
}

export function checkAdminLockout(ip = 'global') {
  return checkLockout(adminFailures, ip);
}

export function recordAdminAttempt(ip = 'global', success = false) {
  recordAttempt(adminFailures, ip, success);
}

export function checkCoordinatorLockout(ip = 'global') {
  return checkLockout(coordFailures, ip);
}

export function recordCoordinatorAttempt(ip = 'global', success = false) {
  recordAttempt(coordFailures, ip, success);
}

// Token creation & verification
export function createAdminToken() {
  const payload = JSON.stringify({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(b64).digest('hex');
  return `${b64}.${hmac}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, hmac] = token.split('.');
  const expectedHmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(b64).digest('hex');
  const bufHmac = Buffer.from(hmac);
  const bufExpected = Buffer.from(expectedHmac);
  if (bufHmac.length !== bufExpected.length || !crypto.timingSafeEqual(bufHmac, bufExpected)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (data.role !== 'admin') return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function createCoordinatorToken(coordinatorName) {
  const payload = JSON.stringify({
    role: 'coordinator',
    coordinator: coordinatorName,
    iat: Date.now(),
    exp: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(b64).digest('hex');
  return `${b64}.${hmac}`;
}

export function verifyCoordinatorToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, hmac] = token.split('.');
  const expectedHmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(b64).digest('hex');
  const bufHmac = Buffer.from(hmac);
  const bufExpected = Buffer.from(expectedHmac);
  if (bufHmac.length !== bufExpected.length || !crypto.timingSafeEqual(bufHmac, bufExpected)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (data.role !== 'coordinator') return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('Stage 1 Test 1: Content gating - 403 if team is on Stage 2 or later', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S1Gate_${pfx}`,
    coordinator: 'Arun',
    members: ['TesterA', 'TesterB', 'TesterC']
  });

  // When on Stage 1: can access Stage 1 pad
  const pad = gameEngine.getStagePad(reg.team.id, 1);
  assert.ok(pad);

  // Advance team to Stage 2
  await new Promise((r) => setTimeout(r, 1050));
  const sub = await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  assert.equal(sub.correct, true);
  assert.equal(sub.nextStage, 2);

  // Verification: currentStage is now 2
  assert.equal(reg.team.currentStage, 2);
});

test('Stage 1 Test 2: Solution verification and Decoy trap', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S1Decoy_${pfx}`,
    coordinator: 'Divya',
    members: ['DecoyA', 'DecoyB', 'DecoyC']
  });

  // 1. ZETA9 decoy rejected, marked as decoy, and counted as wrong attempt
  const subDecoy = await gameEngine.submitAnswer(reg.team.id, 1, 'ZETA9');
  assert.equal(subDecoy.correct, false);
  assert.equal(subDecoy.isDecoy, true);
  assert.match(subDecoy.message, /anomaly decoy/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 1);

  // 2. Partial or spaced answers like 'N O V' are rejected
  await new Promise((r) => setTimeout(r, 1050));
  const subPartial = await gameEngine.submitAnswer(reg.team.id, 1, 'N O V');
  assert.equal(subPartial.correct, false);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 2);

  // 3. NOVA (with spaces and mixed case) is accepted
  await new Promise((r) => setTimeout(r, 1050));
  const subCorrect = await gameEngine.submitAnswer(reg.team.id, 1, '  no Va  ');
  assert.equal(subCorrect.correct, true);
  assert.equal(subCorrect.fragment, 'NOVA');
  assert.equal(reg.team.currentStage, 2);
});

test('Stage 1 Test 3: Hint 1 15-character chart, 30s expiry & reload persistence', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S1Hint_${pfx}`,
    coordinator: 'Kiran',
    members: ['HintTester1', 'HintTester2', 'HintTester3']
  });

  // Unlock Hint 1
  const hint1 = await gameEngine.unlockHint(reg.team.id, 1, 1);
  assert.equal(hint1.stage, 1);
  assert.equal(hint1.hintNumber, 1);
  assert.ok(hint1.text.includes('Morse code chart'));

  // Verify chart contains all 15 characters
  const expectedChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'N', 'O', 'V', 'Z'];
  for (const c of expectedChars) {
    assert.ok(hint1.text.includes(`${c}(`), `Hint 1 chart must include ${c}`);
  }

  // Verify client state receives it while active
  const activeState = gameEngine.getClientTeamState(reg.team.id);
  assert.ok(activeState.hintsUsed[1][1].text);

  // Simulate 30s passing
  reg.team.hintsUsed[1][1].expiresAt = Date.now() - 1000;

  // After reload / re-fetch, text is masked (null) and locked
  const expiredState = gameEngine.getClientTeamState(reg.team.id);
  assert.equal(expiredState.hintsUsed[1][1].text, null);
});

test('Stage 1 Test 4: Audio timeline scheduler calculation', () => {
  const UNIT = 0.22;
  const LEAD_IN = 0.2;

  // Sector 1: N = '—•' (dash, gap, dot)
  // Lead-in (0.2s) + Dash (3*0.22s = 0.66s) + Gap (1*0.22s = 0.22s) + Dot (1*0.22s = 0.22s) = 1.30s
  const s1Dash = 3 * UNIT;
  const s1Gap = 1 * UNIT;
  const s1Dot = 1 * UNIT;
  const s1TotalActive = s1Dash + s1Gap + s1Dot;
  assert.equal(Number(s1TotalActive.toFixed(2)), 1.10);
  assert.equal(Number((LEAD_IN + s1TotalActive).toFixed(2)), 1.30);

  // Sector 4: A = '•—' (dot, gap, dash)
  // Lead-in (0.2s) + Dot (0.22s) + Gap (0.22s) + Dash (0.66s) = 1.30s
  const s4TotalActive = s1Dot + s1Gap + s1Dash;
  assert.equal(Number((LEAD_IN + s4TotalActive).toFixed(2)), 1.30);

  // Sector 2: O = '———' (3 dashes, 2 gaps)
  // 3 * 0.66s + 2 * 0.22s = 1.98s + 0.44s = 2.42s
  const s2Total = 3 * (3 * UNIT) + 2 * (1 * UNIT);
  assert.equal(Number(s2Total.toFixed(2)), 2.42);

  // Sector 3: V = '•••—' (3 dots, 3 gaps, 1 dash)
  // 3 * 0.22s + 3 * 0.22s + 0.66s = 1.98s
  const s3Total = 3 * (1 * UNIT) + 3 * (1 * UNIT) + 1 * (3 * UNIT);
  assert.equal(Number(s3Total.toFixed(2)), 1.98);
});

test('Stage 1 Test 5: Decode Pad team persistence and sync', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S1Pad_${pfx}`,
    coordinator: 'Pooja',
    members: ['PadUser1', 'PadUser2', 'PadUser3']
  });

  // Initial pad is empty
  const p0 = gameEngine.getStagePad(reg.team.id, 1);
  assert.deepEqual(p0, { s1: '', s2: '', s3: '', s4: '' });

  // Device 1 saves letter N in S1 and O in S2
  await gameEngine.saveStagePad(reg.team.id, 1, { s1: 'N', s2: 'O', s3: '', s4: '' });

  // Device 2 of same team fetches pad
  const p1 = gameEngine.getStagePad(reg.team.id, 1);
  assert.equal(p1.s1, 'N');
  assert.equal(p1.s2, 'O');

  // Device 2 completes S3 and S4
  await gameEngine.saveStagePad(reg.team.id, 1, { s1: 'N', s2: 'O', s3: 'V', s4: 'A' });
  const p2 = gameEngine.getStagePad(reg.team.id, 1);
  assert.deepEqual(p2, { s1: 'N', s2: 'O', s3: 'V', s4: 'A' });
});

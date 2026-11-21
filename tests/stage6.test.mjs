import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('Stage 6 Test 1: Mathematical fragment synthesis & checksum calculation', () => {
  const missions = [
    { name: 'CTF Challenges', fragment: '91X', isReversed: false },
    { name: 'Decoding', fragment: '7K2', isReversed: false },
    { name: 'Hex Decryption', fragment: 'HEX82D', isReversed: false },
    { name: 'Prompt the AI', fragment: 'ORBIT', isReversed: true },
    { name: 'Signal Intercept', fragment: 'NOVA', isReversed: false }
  ];

  // Verify A-Z sorting
  const names = missions.map((m) => m.name);
  const sortedNames = [...names].sort();
  assert.deepEqual(names, sortedNames);

  // Assemble key body
  const parts = missions.map((m) =>
    m.isReversed ? m.fragment.split('').reverse().join('') : m.fragment
  );
  assert.equal(parts[3], 'TIBRO'); // ORBIT reversed

  const body = parts.join('-');
  assert.equal(body, '91X-7K2-HEX82D-TIBRO-NOVA');

  // Checksum calculation: sum of all digits 0-9 inside body
  let digitSum = 0;
  for (const ch of body) {
    if (/[0-9]/.test(ch)) {
      digitSum += parseInt(ch, 10);
    }
  }
  // 9 + 1 + 7 + 2 + 8 + 2 = 29
  assert.equal(digitSum, 29);

  const fullKey = `FO{${body}}#${digitSum}`;
  assert.equal(fullKey, 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29');
});

test('Stage 6 Test 2: Full Game Completion, Clock Stop & Verification Code', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S6Final_${pfx}`,
    coordinator: 'Arun',
    members: ['WinnerA', 'WinnerB', 'WinnerC']
  });

  // Stage 1: NOVA
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');

  // Stage 2: 7K2
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');

  // Stage 3: ORBIT
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');

  // Stage 4: Solve all 3 stations then submit 91X
  await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  await gameEngine.checkStage4Station(reg.team.id, 2, '1');
  await gameEngine.checkStage4Station(reg.team.id, 3, 'X');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 4, '91X');

  // Stage 5: HEX82D
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 5, 'HEX82D');
  assert.equal(reg.team.currentStage, 6);

  // 1. Invalid checksum submission -> rejected
  await new Promise((r) => setTimeout(r, 1050));
  const subWrongChecksum = await gameEngine.submitAnswer(
    reg.team.id,
    6,
    'FO{91X-7K2-HEX82D-TIBRO-NOVA}#28'
  );
  assert.equal(subWrongChecksum.correct, false);
  assert.equal(reg.team.isCompleted, false);

  // 2. Correct Master Key submission -> VICTORY!
  await new Promise((r) => setTimeout(r, 1050));
  const subVictory = await gameEngine.submitAnswer(
    reg.team.id,
    6,
    '  fo{91x-7k2-hex82d-tibro-nova}#29  '
  );

  assert.equal(subVictory.correct, true);
  assert.equal(subVictory.isCompleted, true);
  assert.ok(subVictory.verificationCode);
  assert.equal(subVictory.verificationCode.length, 8);

  // Team state assertions
  assert.equal(reg.team.isCompleted, true);
  assert.ok(reg.team.endTime > reg.team.startTime);

  // Leaderboard shows completed team
  const lb = gameEngine.getLeaderboard();
  const found = lb.find((t) => t.teamName === `S6Final_${pfx}`);
  assert.ok(found);
  assert.equal(found.isCompleted, true);
  assert.equal(found.currentStage, 6);
  assert.ok(found.finalRankTimeSeconds > 0);
});

test('Stage 6 Test 3: Hint 1 and Hint 2 content verification', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S6Hints_${pfx}`,
    coordinator: 'Divya',
    members: ['HintTester1', 'HintTester2', 'HintTester3']
  });

  // Advance through Stages 1-5
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');
  await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  await gameEngine.checkStage4Station(reg.team.id, 2, '1');
  await gameEngine.checkStage4Station(reg.team.id, 3, 'X');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 4, '91X');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 5, 'HEX82D');
  assert.equal(reg.team.currentStage, 6);

  const h1 = await gameEngine.unlockHint(reg.team.id, 6, 1);
  assert.ok(h1.text.includes('Sort the 5 missions A-Z'));

  const h2 = await gameEngine.unlockHint(reg.team.id, 6, 2);
  assert.ok(h2.text.includes('sum of all digits'));
});

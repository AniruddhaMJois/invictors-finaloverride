import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('Stage 5 Test 1: Content gating - 403 if team is on Stage 4 or earlier', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S5Gate_${pfx}`,
    coordinator: 'Arun',
    members: ['TesterA', 'TesterB', 'TesterC']
  });

  // Verify currently on Stage 1
  assert.equal(reg.team.currentStage, 1);
});

test('Stage 5 Test 2: Hex to ASCII pure decoding verification', () => {
  const rawBytes = ['48', '45', '58', '38', '32', '44'];
  const ascii = rawBytes.map((b) => String.fromCharCode(parseInt(b, 16))).join('');
  assert.equal(ascii, 'HEX82D');
});

test('Stage 5 Test 3: Answer submission (HEX82D vs ZETA9)', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S5Ans_${pfx}`,
    coordinator: 'Divya',
    members: ['HexA', 'HexB', 'HexC']
  });

  // Advance to Stage 5: 1 -> 2 -> 3 -> 4 -> 5
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');

  // Stage 4: Solve all 3 stations then submit 91X
  await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  await gameEngine.checkStage4Station(reg.team.id, 2, '1');
  await gameEngine.checkStage4Station(reg.team.id, 3, 'X');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 4, '91X');
  assert.equal(reg.team.currentStage, 5);

  // 1. Decoy ZETA9 submitted on Stage 5 -> rejected and counted
  await new Promise((r) => setTimeout(r, 1050));
  const subZeta = await gameEngine.submitAnswer(reg.team.id, 5, 'ZETA9');
  assert.equal(subZeta.correct, false);
  assert.equal(subZeta.isDecoy, true);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 1);

  // 2. Correct answer HEX82D (with whitespace and lowercase) -> accepted, unlocks Stage 6
  await new Promise((r) => setTimeout(r, 1050));
  const subHex = await gameEngine.submitAnswer(reg.team.id, 5, '  hex82d  ');
  assert.equal(subHex.correct, true);
  assert.equal(subHex.fragment, 'HEX82D');
  assert.equal(reg.team.currentStage, 6);
  assert.equal(reg.team.fragments[5], 'HEX82D');
});

test('Stage 5 Test 4: Hint 1 and Hint 2 verification', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S5Hints_${pfx}`,
    coordinator: 'Kiran',
    members: ['HintA', 'HintB', 'HintC']
  });

  // Advance to Stage 5
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
  assert.equal(reg.team.currentStage, 5);

  const h1 = await gameEngine.unlockHint(reg.team.id, 5, 1);
  assert.ok(h1.text.includes('Column 1'));

  const h2 = await gameEngine.unlockHint(reg.team.id, 5, 2);
  assert.ok(h2.text.includes('48 45 58 38 32 44'));
});

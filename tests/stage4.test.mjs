import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('Stage 4 Test 1: Content gating - 403 if team is on Stage 3 or earlier', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S4Gate_${pfx}`,
    coordinator: 'Arun',
    members: ['TesterA', 'TesterB', 'TesterC']
  });

  // Currently on Stage 1 -> Attempt to check Stage 4 station
  await assert.rejects(
    async () => {
      await gameEngine.checkStage4Station(reg.team.id, 1, '9');
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /only accessible while on Stage 4/);
      return true;
    }
  );
});

test('Stage 4 Test 2: Camera image pixel verification', () => {
  const imgPath = path.join(__dirname, '../server/assets/stage4/camera.png');
  assert.ok(fs.existsSync(imgPath), 'Camera feed PNG must exist');

  const buf = fs.readFileSync(imgPath);
  // PNG signature
  assert.equal(buf[0], 0x89);
  assert.equal(buf[1], 0x50); // P
  assert.equal(buf[2], 0x4e); // N
  assert.equal(buf[3], 0x47); // G

  // Check dimensions: 640 x 360
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert.equal(width, 640);
  assert.equal(height, 360);
});

test('Stage 4 Test 3: Station answers (1 = 9, 2 = 1, 3 = X) and wrong attempts counting', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S4Stations_${pfx}`,
    coordinator: 'Divya',
    members: ['StationA', 'StationB', 'StationC']
  });

  // Advance to Stage 4: Stage 1 -> 2 -> 3 -> 4
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');
  assert.equal(reg.team.currentStage, 4);

  // 1. Station 1: Wrong answer returns not ok and increases wrong attempt count
  const s1Wrong = await gameEngine.checkStage4Station(reg.team.id, 1, '3');
  assert.equal(s1Wrong.ok, false);
  assert.match(s1Wrong.message, /Not quite, look again/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 1);

  // 2. Station 1: Correct answer (9) succeeds and records solved station
  const s1Correct = await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  assert.equal(s1Correct.ok, true);
  assert.deepEqual(s1Correct.solvedStations, [1]);
  assert.equal(s1Correct.allSolved, false);

  // 3. Station 2: Wrong answer
  const s2Wrong = await gameEngine.checkStage4Station(reg.team.id, 2, '5');
  assert.equal(s2Wrong.ok, false);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 2);

  // 4. Station 2: Correct answer (1)
  const s2Correct = await gameEngine.checkStage4Station(reg.team.id, 2, '1');
  assert.equal(s2Correct.ok, true);
  assert.deepEqual(s2Correct.solvedStations, [1, 2]);
  assert.equal(s2Correct.allSolved, false);

  // 5. Station 3: Correct answer ('x' case-insensitive)
  const s3Correct = await gameEngine.checkStage4Station(reg.team.id, 3, '  x  ');
  assert.equal(s3Correct.ok, true);
  assert.deepEqual(s3Correct.solvedStations, [1, 2, 3]);
  assert.equal(s3Correct.allSolved, true);
});

test('Stage 4 Test 4: Final 91X submission gate (rejects before all stations solved)', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S4Gate91X_${pfx}`,
    coordinator: 'Kiran',
    members: ['GateTester1', 'GateTester2', 'GateTester3']
  });

  // Advance to Stage 4
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');
  assert.equal(reg.team.currentStage, 4);

  // Solve only station 1 and 2 (leave station 3 unsolved)
  await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  await gameEngine.checkStage4Station(reg.team.id, 2, '1');

  // Submit 91X prematurely -> Must be rejected!
  await new Promise((r) => setTimeout(r, 1050));
  const subEarly = await gameEngine.submitAnswer(reg.team.id, 4, '91X');
  assert.equal(subEarly.correct, false);
  assert.match(subEarly.message, /Solve all 3 stations first/);
  assert.equal(reg.team.currentStage, 4); // Still on Stage 4

  // Decoy ZETA9 submitted -> rejected
  await new Promise((r) => setTimeout(r, 1050));
  const subDecoy = await gameEngine.submitAnswer(reg.team.id, 4, 'ZETA9');
  assert.equal(subDecoy.correct, false);
  assert.equal(reg.team.currentStage, 4);

  // Now solve Station 3
  const s3 = await gameEngine.checkStage4Station(reg.team.id, 3, 'X');
  assert.equal(s3.allSolved, true);

  // Submit 91X after all 3 stations are solved -> Accepted, unlocks Stage 5!
  await new Promise((r) => setTimeout(r, 1050));
  const subFinal = await gameEngine.submitAnswer(reg.team.id, 4, '  91x  ');
  assert.equal(subFinal.correct, true);
  assert.equal(subFinal.fragment, '91X');
  assert.equal(reg.team.currentStage, 5);
  assert.equal(reg.team.fragments[4], '91X');
});

test('Stage 4 Test 5: Station persistence across server reloads', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S4Reload_${pfx}`,
    coordinator: 'Arun',
    members: ['SyncA', 'SyncB', 'SyncC']
  });

  // Advance to Stage 4
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');
  assert.equal(reg.team.currentStage, 4);

  // Solve stations 1 and 3
  await gameEngine.checkStage4Station(reg.team.id, 1, '9');
  await gameEngine.checkStage4Station(reg.team.id, 3, 'X');

  // Verify memory state
  const memSolved = gameEngine.getStage4SolvedStations(reg.team.id);
  assert.deepEqual(memSolved, [1, 3]);

  // Simulate server reload from SQLite
  const newEngine = new (gameEngine.constructor)();
  await newEngine.loadFromDb();
  const dbSolved = newEngine.getStage4SolvedStations(reg.team.id);
  assert.deepEqual(dbSolved, [1, 3]);
});

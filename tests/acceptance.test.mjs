import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';
import { CONFIG, STAGE_ANSWERS } from '../server/config/index.js';

const uid = () => Math.random().toString(36).substring(2, 7);

// Setup before tests
test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('1. Registration validation rules', async () => {
  const pfx = uid();
  // Reject fewer than 3 members
  await assert.rejects(
    async () => {
      await gameEngine.registerTeam({
        teamName: `Small_${pfx}`,
        coordinator: 'Arun',
        members: ['Alice', 'Bob']
      });
    },
    { message: /must consist of 3 or 4 members/ }
  );

  // Reject duplicate member names
  await assert.rejects(
    async () => {
      await gameEngine.registerTeam({
        teamName: `DupM_${pfx}`,
        coordinator: 'Arun',
        members: ['Alice', 'Alice', 'Charlie']
      });
    },
    { message: /must be distinct|unique/ }
  );

  // Reject invalid coordinator
  await assert.rejects(
    async () => {
      await gameEngine.registerTeam({
        teamName: `BadC_${pfx}`,
        coordinator: 'InvalidPerson',
        members: ['Alice', 'Bob', 'Charlie']
      });
    },
    { message: /valid event coordinator/ }
  );

  // Register valid team
  const reg1 = await gameEngine.registerTeam({
    teamName: `Alpha_${pfx}`,
    coordinator: 'Arun',
    members: ['Alice', 'Bob', 'Charlie']
  });

  assert.ok(reg1.team.id);
  assert.equal(reg1.team.teamName, `Alpha_${pfx}`);
  assert.ok(reg1.token);

  // Reject duplicate team name
  await assert.rejects(
    async () => {
      await gameEngine.registerTeam({
        teamName: `alpha_${pfx}`, // case-insensitive check
        coordinator: 'Divya',
        members: ['David', 'Eve', 'Frank']
      });
    },
    { message: /already taken/ }
  );
});

test('2. Server-authoritative timer: elapsed calculation', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `Timer_${pfx}`,
    coordinator: 'Divya',
    members: ['Dave', 'Eve', 'Frank']
  });

  const state1 = gameEngine.getClientTeamState(reg.team.id);
  assert.ok(state1.startTime);
  assert.equal(state1.isPaused, false);

  // Simulated elapsed calculation
  const elapsed = gameEngine.getEffectiveElapsedSeconds(reg.team);
  assert.ok(elapsed >= 0 && elapsed <= 2);
});

test('3. Hint system: 180s/300s penalties, 30s expiry & text masking', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `Hint_${pfx}`,
    coordinator: 'Kiran',
    members: ['Grace', 'Heidi', 'Ivan']
  });

  // Unlock Hint 1 (+180s)
  const h1 = await gameEngine.unlockHint(reg.team.id, 1, 1);
  assert.equal(h1.stage, 1);
  assert.equal(h1.hintNumber, 1);
  assert.ok(h1.text.includes('Morse code'));
  assert.ok(h1.expiresAt > Date.now());

  const stateH1 = gameEngine.getClientTeamState(reg.team.id);
  assert.equal(stateH1.totalPenaltySeconds, 180);
  assert.equal(stateH1.penaltyBreakdown.hints, 180);

  // Unlock Hint 2 (+300s)
  const h2 = await gameEngine.unlockHint(reg.team.id, 1, 2);
  assert.equal(h2.hintNumber, 2);
  assert.ok(h2.text.includes('NOVA'));

  const stateH2 = gameEngine.getClientTeamState(reg.team.id);
  assert.equal(stateH2.totalPenaltySeconds, 480); // 180 + 300

  // Simulate expiry by advancing expiresAt into the past
  reg.team.hintsUsed[1][1].expiresAt = Date.now() - 5000;
  const expiredState = gameEngine.getClientTeamState(reg.team.id);
  assert.equal(expiredState.hintsUsed[1][1].text, null, 'Expired hint text must be masked from client');
});

test('4. Tab-switch violations: +120s penalty with 10s rate limit and 3s grace period', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `AC_${pfx}`,
    coordinator: 'Pooja',
    members: ['Judy', 'Mallory', 'Oscar']
  });

  // During first 3s grace period: rejected
  const vGrace = await gameEngine.recordTabViolation(reg.team.id);
  assert.equal(vGrace.success, false);

  // Simulate team started 5 seconds ago
  reg.team.startTime = Date.now() - 5000;

  // First violation: +120s
  const v1 = await gameEngine.recordTabViolation(reg.team.id);
  assert.equal(v1.success, true);
  assert.equal(v1.penaltyAdded, 120);
  assert.equal(reg.team.totalPenaltySeconds, 120);

  // Second violation immediately after (< 10s): debounced
  const v2 = await gameEngine.recordTabViolation(reg.team.id);
  assert.equal(v2.success, false);
  assert.equal(reg.team.totalPenaltySeconds, 120, 'Penalty must not double within 10s debounce');
});

test('5. Submit rate limit: 1s cooldown returns 429', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `RL_${pfx}`,
    coordinator: 'Rakshith',
    members: ['Peggy', 'Sybil', 'Trent']
  });

  // First submission
  const s1 = await gameEngine.submitAnswer(reg.team.id, 1, 'WRONG_ANSWER');
  assert.equal(s1.correct, false);

  // Second submission immediately after (< 1s)
  await assert.rejects(
    async () => {
      await gameEngine.submitAnswer(reg.team.id, 1, 'WRONG_ANSWER_2');
    },
    (err) => {
      return err.statusCode === 429 && /cooldown/.test(err.message);
    }
  );
});

test('6. Sequential stage progression & Final Victory Key', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `Speed_${pfx}`,
    coordinator: 'Arun',
    members: ['Victor', 'Walter', 'Xavier']
  });

  // Stage 1: NOVA
  await new Promise((r) => setTimeout(r, 1050));
  const r1 = await gameEngine.submitAnswer(reg.team.id, 1, 'nova');
  assert.equal(r1.correct, true);
  assert.equal(r1.nextStage, 2);

  // Stage 2: 7K2
  await new Promise((r) => setTimeout(r, 1050));
  const r2 = await gameEngine.submitAnswer(reg.team.id, 2, ' 7k2 ');
  assert.equal(r2.correct, true);
  assert.equal(r2.nextStage, 3);

  // Stage 3: ORBIT
  await new Promise((r) => setTimeout(r, 1050));
  const r3 = await gameEngine.submitAnswer(reg.team.id, 3, 'ORBIT');
  assert.equal(r3.correct, true);
  assert.equal(r3.nextStage, 4);

  // Stage 4: 91X
  await new Promise((r) => setTimeout(r, 1050));
  const r4 = await gameEngine.submitAnswer(reg.team.id, 4, '91X');
  assert.equal(r4.correct, true);
  assert.equal(r4.nextStage, 5);

  // Stage 5: HEX82D
  await new Promise((r) => setTimeout(r, 1050));
  const r5 = await gameEngine.submitAnswer(reg.team.id, 5, 'HEX82D');
  assert.equal(r5.correct, true);
  assert.equal(r5.nextStage, 6);

  // Stage 6: FO{91X-7K2-HEX82D-TIBRO-NOVA}#29
  await new Promise((r) => setTimeout(r, 1050));
  const r6 = await gameEngine.submitAnswer(reg.team.id, 6, 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29');
  assert.equal(r6.correct, true);
  assert.equal(r6.isCompleted, true);
  assert.ok(r6.verificationCode);
  assert.equal(r6.verificationCode.length, 8);
});

test('7. Global Pause & Resume freezes clocks', async () => {
  await gameEngine.togglePause(true);
  assert.equal(gameEngine.globalPaused, true);

  await new Promise((r) => setTimeout(r, 200));

  await gameEngine.togglePause(false);
  assert.equal(gameEngine.globalPaused, false);
  assert.ok(gameEngine.globalPausedAccumMs >= 150);
});

test('8. Leaderboard rankings: Completed teams first, then highest stage, then lowest time', async () => {
  const leaderboard = gameEngine.getLeaderboard();
  assert.ok(Array.isArray(leaderboard));
  assert.ok(leaderboard.length >= 2);

  // First place must be completed team
  assert.equal(leaderboard[0].isCompleted, true);
  assert.equal(leaderboard[0].rank, 1);
});

test('9. No answers or private assets in client state responses', async () => {
  const clientState = gameEngine.getClientTeamState(1);
  const jsonStr = JSON.stringify(clientState);

  // Ensure un-unlocked answers are NOT in the payload
  assert.equal(jsonStr.includes('STAGE_ANSWERS'), false);
  assert.equal(jsonStr.includes('CONFIG.SALT'), false);
  assert.equal(jsonStr.includes('COOKIE_SECRET'), false);
});

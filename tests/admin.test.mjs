import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';
import { CONFIG } from '../server/config/index.js';
import {
  createAdminToken,
  verifyAdminToken,
  createCoordinatorToken,
  verifyCoordinatorToken,
  checkAdminLockout,
  recordAdminAttempt,
  checkCoordinatorLockout,
  recordCoordinatorAttempt
} from '../server/services/auth.js';

const uid = () => Math.random().toString(36).substring(2, 7);

describe('PROMPT 2: Master Admin Portal & Coordinator Portals', () => {
  before(async () => {
    await db.init();
    await gameEngine.loadFromDb();
  });

  test('1. Admin PIN authentication, signed token, and 5-failure lockout', async () => {
    const testIp = 'test_ip_admin_lockout_' + uid();

    // Verify initial check is not locked
    const initLock = checkAdminLockout(testIp);
    assert.equal(initLock.locked, false);

    // Fail 4 times
    for (let i = 0; i < 4; i++) {
      recordAdminAttempt(testIp, false);
      assert.equal(checkAdminLockout(testIp).locked, false);
    }

    // 5th failure triggers lockout
    recordAdminAttempt(testIp, false);
    const lockedState = checkAdminLockout(testIp);
    assert.equal(lockedState.locked, true);
    assert.ok(lockedState.remainingSeconds > 0 && lockedState.remainingSeconds <= 60);

    // Successful login resets lockout
    recordAdminAttempt(testIp, true);
    assert.equal(checkAdminLockout(testIp).locked, false);

    // Verify admin token creation and verification
    const adminToken = createAdminToken();
    const verified = verifyAdminToken(adminToken);
    assert.ok(verified);
    assert.equal(verified.role, 'admin');

    // Tampered token fails
    assert.equal(verifyAdminToken(adminToken + 'tamper'), null);
    assert.equal(verifyAdminToken('invalid.token'), null);
  });

  test('2. Coordinator PIN authentication and strict DB partitioning', async () => {
    const pfx = uid();
    // Register two squads under different coordinators
    const teamArun = await gameEngine.registerTeam({
      teamName: `Squad_Arun_${pfx}`,
      coordinator: 'Arun',
      members: ['Alice', 'Bob', 'Charlie']
    });

    const teamPooja = await gameEngine.registerTeam({
      teamName: `Squad_Pooja_${pfx}`,
      coordinator: 'Pooja',
      members: ['Dave', 'Eve', 'Frank']
    });

    // Test coordinator token creation
    const arunToken = createCoordinatorToken('Arun');
    const verifiedArun = verifyCoordinatorToken(arunToken);
    assert.ok(verifiedArun);
    assert.equal(verifiedArun.coordinator, 'Arun');

    // Verify coordinator partition: Arun sees only Arun teams
    const arunTeams = gameEngine.getCoordinatorTeams('Arun');
    assert.ok(arunTeams.some((t) => t.id === teamArun.team.id));
    assert.equal(arunTeams.some((t) => t.id === teamPooja.team.id), false, 'Arun must NOT see Pooja team');

    // Pooja sees only Pooja teams
    const poojaTeams = gameEngine.getCoordinatorTeams('Pooja');
    assert.ok(poojaTeams.some((t) => t.id === teamPooja.team.id));
    assert.equal(poojaTeams.some((t) => t.id === teamArun.team.id), false, 'Pooja must NOT see Arun team');

    // Coordinator lockout test
    const coordIp = 'test_ip_coord_' + uid();
    for (let i = 0; i < 5; i++) {
      recordCoordinatorAttempt(coordIp, false);
    }
    const coordLock = checkCoordinatorLockout(coordIp);
    assert.equal(coordLock.locked, true);
    recordCoordinatorAttempt(coordIp, true);
    assert.equal(checkCoordinatorLockout(coordIp).locked, false);
  });

  test('3. Hints Manager: Inline editing, live update to active players, DB persistence & revert', async () => {
    const pfx = uid();
    const reg = await gameEngine.registerTeam({
      teamName: `HintEdit_${pfx}`,
      coordinator: 'Divya',
      members: ['Grace', 'Heidi', 'Ivan']
    });

    // Unlock Hint 1 on Stage 1
    const originalHint = await gameEngine.unlockHint(reg.team.id, 1, 1);
    assert.ok(originalHint.text && originalHint.text.length > 10, 'Hint text must be populated');

    // Admin edits Hint 1 on Stage 1 for the team's set
    const customText = '⚠️ CUSTOM ADMIN HINT: Look closely at Sector 1 pulse graph phosphor trace!';
    await gameEngine.updateHint(1, 1, customText, 'MasterAdmin', reg.team.setId);

    // Active team state should immediately reflect the updated hint
    assert.equal(reg.team.hintsUsed[1][1].text, customText);

    // Verify persisted in Database
    const row = await db.get('SELECT text FROM hints WHERE stage = 1 AND n = 1 AND set_id = ?', [reg.team.setId]);
    assert.equal(row.text, customText);

    // Verify live DB hints getter returns the updated text
    const liveDbHints = await gameEngine.getLiveDbHints(reg.team.setId);
    assert.equal(liveDbHints[1][1], customText);

    // Audit log should record the edit
    const auditLogs = await gameEngine.getAuditLog({ action: 'edit_hint', limit: 5 });
    assert.ok(auditLogs.length > 0);
    assert.equal(auditLogs[0].actor, 'MasterAdmin');

    // Revert hint to default
    await gameEngine.revertHint(1, 1, 'MasterAdmin', reg.team.setId);
    const revertedRow = await db.get('SELECT text FROM hints WHERE stage = 1 AND n = 1 AND set_id = ?', [reg.team.setId]);
    assert.ok(revertedRow.text.length > 10);
  });

  test('4. Admin Emergency Actions: Waive Penalty, Unbind Device, Skip Stage, Restart Team', async () => {
    const pfx = uid();
    const reg = await gameEngine.registerTeam({
      teamName: `AdminActions_${pfx}`,
      coordinator: 'Kiran',
      members: ['Judy', 'Mallory', 'Niaj']
    });

    // Set startTime to 5s in past to clear the 3s registration grace period
    reg.team.startTime = Date.now() - 5000;

    // 1. Incur tab-switch penalty (+120s)
    await gameEngine.recordTabViolation(reg.team.id);
    assert.equal(reg.team.totalPenaltySeconds, 120);

    // Find violation record
    const violation = await db.get('SELECT id FROM violations WHERE team_id = ? AND (waived = FALSE OR waived = 0)', [reg.team.id]);
    assert.ok(violation);

    // Waive penalty
    const waiveResult = await gameEngine.waivePenalty(reg.team.id, violation.id, 'Admin');
    assert.equal(waiveResult.success, true);
    assert.equal(reg.team.totalPenaltySeconds, 0, 'Penalty must be 0 after waive');
    const waivedDb = await db.get('SELECT waived FROM violations WHERE id = ?', [violation.id]);
    assert.equal(Boolean(waivedDb.waived), true);

    // 2. Unbind Device
    const deviceToken = reg.token;
    assert.ok(gameEngine.tokens.has(deviceToken));
    await gameEngine.unbindDevice(deviceToken, 'Admin');
    assert.equal(gameEngine.tokens.has(deviceToken), false, 'Token must be deleted from memory');
    const devDb = await db.get('SELECT * FROM devices WHERE token = ?', [deviceToken]);
    assert.ok(!devDb, 'Device must be removed from database');

    // 3. Skip Stage (Stage 1 -> Stage 2)
    const skipResult = await gameEngine.skipStage(reg.team.id, 'Admin');
    assert.equal(skipResult.success, true);
    assert.equal(skipResult.nextStage, 2);
    assert.equal(reg.team.currentStage, 2);
    assert.ok(['NOVA', 'LUNA', 'VEGA', 'MARS', 'ECHO'].includes(reg.team.fragments[1]), 'Stage 1 fragment must be valid');

    // 4. Restart Team (Requires exact team name)
    await assert.rejects(
      async () => {
        await gameEngine.restartTeam(reg.team.id, 'WrongName', 'Admin');
      },
      /Confirmation mismatch/
    );

    // Correct confirmation restarts team to Stage 1
    await gameEngine.restartTeam(reg.team.id, reg.team.teamName, 'Admin');
    assert.equal(reg.team.currentStage, 1);
    assert.equal(reg.team.isCompleted, false);
    assert.equal(reg.team.totalPenaltySeconds, 0);
    assert.deepEqual(reg.team.fragments, {});
  });

  test('5. Live Answer Key Inspector & Audit Logging', async () => {
    // Calling getAdminOverview returns expected counters and alerts
    const overview = gameEngine.getAdminOverview();
    assert.ok(overview.counters);
    assert.ok(typeof overview.averageStage === 'string');
    assert.ok(overview.stageDistribution);

    // Timeline query
    const sampleTeam = Array.from(gameEngine.teams.values())[0];
    if (sampleTeam) {
      const timeline = await gameEngine.getTeamTimeline(sampleTeam.id);
      assert.ok(timeline.team);
      assert.ok(Array.isArray(timeline.events));
    }

    // Audit log records
    await gameEngine.logAudit('Admin', 'inspect_keys', 'Inspected master keys');
    const logs = await gameEngine.getAuditLog({ action: 'inspect_keys', limit: 1 });
    assert.ok(logs.length > 0);
    assert.equal(logs[0].action, 'inspect_keys');
  });

  test('6. CSV Export generation contains proper headers and teams', async () => {
    const csv = gameEngine.generateCsvExport();
    assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
    assert.ok(csv.includes('Team ID,Team Name,Coordinator,Leader,Members'));
    assert.ok(csv.includes('Verification Hash'));
  });

  test('7. Coordinator "Call Admin" alerts push to Master Admin Alert Strip', async () => {
    const pfx = uid();
    const reg = await gameEngine.registerTeam({
      teamName: `CallAdmin_${pfx}`,
      coordinator: 'Rakshith',
      members: ['Oscar', 'Peggy', 'Sybil']
    });

    const alert = await gameEngine.addCoordinatorAlert({
      coordinator: 'Rakshith',
      teamId: reg.team.id,
      message: 'Battery died on player laptop, please assist with unbind.'
    });

    assert.ok(alert.id);
    assert.equal(alert.coordinator, 'Rakshith');
    assert.equal(alert.teamName, reg.team.teamName);

    // Check alert is present in Admin Overview
    const overview = gameEngine.getAdminOverview();
    const foundAlert = overview.alerts.find((a) => a.id === alert.id);
    assert.ok(foundAlert, 'Alert must appear in Master Admin alerts list');
    assert.equal(foundAlert.message, 'Battery died on player laptop, please assist with unbind.');

    // Dismiss alert
    gameEngine.dismissAdminAlert(alert.id);
    const updatedOverview = gameEngine.getAdminOverview();
    assert.equal(updatedOverview.alerts.some((a) => a.id === alert.id), false, 'Alert must be dismissed');
  });

  test('8. Answer key access is strictly for Master Admin and live sets A-E are retrieved', async () => {
    // 1. Token role separation: Coordinator token cannot act as Admin
    const coordToken = createCoordinatorToken('TestCoordinator');
    const adminCheck = verifyAdminToken(coordToken);
    assert.equal(adminCheck, null, 'Coordinator token must never validate as Master Admin');

    const adminToken = createAdminToken();
    const verifiedAdmin = verifyAdminToken(adminToken);
    assert.ok(verifiedAdmin, 'Admin token must validate');

    // 2. Question Sets in Database for Sets A-E
    const sets = await db.all('SELECT * FROM question_sets ORDER BY set_id ASC');
    assert.equal(sets.length, 5, 'All 5 challenge sets (A-E) must be present in database');
    const setIds = sets.map((s) => s.set_id);
    assert.deepEqual(setIds, ['A', 'B', 'C', 'D', 'E']);

    // Check Set A
    const setA = sets.find((s) => s.set_id === 'A');
    assert.equal(setA.stage1_answer, 'NOVA');
    assert.equal(setA.stage2_answer, '7K2');
    assert.equal(setA.stage2_phrase, 'AURORA');
    assert.equal(setA.stage3_answer, 'ORBIT');
    assert.equal(setA.stage4_answer, '91X');
    assert.equal(setA.stage5_answer, 'HEX82D');
    assert.equal(setA.stage6_answer, 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29');

    // 3. Database URL Pooler Resolution Check
    const rawDirectUrl = 'postgresql://postgres:SecretPass123@db.unwpqxstbvjgkulfzpve.supabase.co:5432/postgres';
    const resolvedUrl = db.pgUrl;
    assert.ok(resolvedUrl.includes('.pooler.supabase.com'), 'Active DB connection must use the pooler host');
    assert.ok(resolvedUrl.includes(':6543'), 'Active DB connection must use pooler port 6543');
  });
});

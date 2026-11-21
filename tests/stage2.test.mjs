import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';
import {
  base64Decode,
  hexDecode,
  rot13,
  atbashMirror,
  reverseString,
  rot5,
  caesarPlus3,
  vigenereDecrypt,
  calculateReadability,
  STAGE2_VARIANTS,
  TARGET_PLAINTEXT,
  getTeamVariant
} from '../shared/ciphers.js';

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

test('Stage 2 Test 1: Pure crypto module & 6-variant pipeline verification', () => {
  // 1. Verify all 6 variants correctly resolve to TARGET_PLAINTEXT
  assert.equal(STAGE2_VARIANTS.length, 6);

  // Variant 0: Base64 -> Hex -> ROT13
  const v0_step1 = base64Decode(STAGE2_VARIANTS[0].payload);
  assert.equal(v0_step1.success, true);
  const v0_step2 = hexDecode(v0_step1.text);
  assert.equal(v0_step2.success, true);
  const v0_step3 = rot13(v0_step2.text);
  assert.equal(v0_step3.text, TARGET_PLAINTEXT);

  // Variant 1: Base64 -> Hex -> Atbash
  const v1_step1 = base64Decode(STAGE2_VARIANTS[1].payload);
  assert.equal(v1_step1.success, true);
  const v1_step2 = hexDecode(v1_step1.text);
  assert.equal(v1_step2.success, true);
  const v1_step3 = atbashMirror(v1_step2.text);
  assert.equal(v1_step3.text, TARGET_PLAINTEXT);

  // Variant 2: Hex -> Base64 -> ROT13
  const v2_step1 = hexDecode(STAGE2_VARIANTS[2].payload);
  assert.equal(v2_step1.success, true);
  const v2_step2 = base64Decode(v2_step1.text);
  assert.equal(v2_step2.success, true);
  const v2_step3 = rot13(v2_step2.text);
  assert.equal(v2_step3.text, TARGET_PLAINTEXT);

  // Variant 3: Hex -> Base64 -> Atbash
  const v3_step1 = hexDecode(STAGE2_VARIANTS[3].payload);
  assert.equal(v3_step1.success, true);
  const v3_step2 = base64Decode(v3_step1.text);
  assert.equal(v3_step2.success, true);
  const v3_step3 = atbashMirror(v3_step2.text);
  assert.equal(v3_step3.text, TARGET_PLAINTEXT);

  // Variant 4: Base64 -> Hex -> Reverse
  const v4_step1 = base64Decode(STAGE2_VARIANTS[4].payload);
  assert.equal(v4_step1.success, true);
  const v4_step2 = hexDecode(v4_step1.text);
  assert.equal(v4_step2.success, true);
  const v4_step3 = reverseString(v4_step2.text);
  assert.equal(v4_step3.text, TARGET_PLAINTEXT);

  // Variant 5: Base64 -> Hex -> Caesar +3
  const v5_step1 = base64Decode(STAGE2_VARIANTS[5].payload);
  assert.equal(v5_step1.success, true);
  const v5_step2 = hexDecode(v5_step1.text);
  assert.equal(v5_step2.success, true);
  const v5_step3 = caesarPlus3(v5_step2.text);
  assert.equal(v5_step3.text, TARGET_PLAINTEXT);
});

test('Stage 2 Test 2: Decoy tools and error handling robustness', () => {
  // Invalid Base64 does not throw
  const b64Err = base64Decode('***invalid base64***');
  assert.equal(b64Err.success, false);
  assert.match(b64Err.error, /not valid Base64/);

  // Invalid Hex does not throw
  const hexErr = hexDecode('12345'); // odd length
  assert.equal(hexErr.success, false);
  assert.match(hexErr.error, /not valid Hex/);

  // Vigenère with invalid key
  const vigErr1 = vigenereDecrypt('HELLO', '');
  assert.equal(vigErr1.success, false);
  const vigErr2 = vigenereDecrypt('HELLO', '123');
  assert.equal(vigErr2.success, false);

  // Vigenère valid
  const vigOk = vigenereDecrypt('RIJVS', 'KEY');
  assert.equal(vigOk.success, true);

  // ROT5 on digits only
  const rot5Res = rot5('Year 2026!');
  assert.equal(rot5Res.text, 'Year 7571!');

  // Atbash on characters
  const atbashRes = atbashMirror('AZ az 123');
  assert.equal(atbashRes.text, 'ZA za 123');
});

test('Stage 2 Test 3: Readability meter scoring thresholds', () => {
  // Raw payload readability is <= 25
  const rawScore = calculateReadability(STAGE2_VARIANTS[0].payload);
  assert.ok(rawScore <= 25, `Expected <= 25, got ${rawScore}`);

  // Hex string readability is <= 30
  const hexScore = calculateReadability('4e5050524646204355454e4652205646204e484542454e');
  assert.ok(hexScore <= 30, `Expected <= 30, got ${hexScore}`);

  // Final plaintext readability is >= 80 (should be 100)
  const plainScore = calculateReadability(TARGET_PLAINTEXT);
  assert.ok(plainScore >= 80, `Expected >= 80, got ${plainScore}`);
  assert.equal(plainScore, 100);
});

test('Stage 2 Test 4: Answer submission and Decoy trap verification (7K2, ZETA9, AURORA, 7X2)', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S2Ans_${pfx}`,
    coordinator: 'Arun',
    members: ['TesterA', 'TesterB', 'TesterC']
  });

  // Advance to Stage 2 by clearing Stage 1
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  assert.equal(reg.team.currentStage, 2);

  // 1. Decoy ZETA9
  await new Promise((r) => setTimeout(r, 1050));
  const subZeta = await gameEngine.submitAnswer(reg.team.id, 2, 'ZETA9');
  assert.equal(subZeta.correct, false);
  assert.equal(subZeta.isDecoy, true);
  assert.match(subZeta.message, /anomaly decoy/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 1);

  // 2. Decoy AURORA (Access phrase for Mission 3)
  await new Promise((r) => setTimeout(r, 1050));
  const subAurora = await gameEngine.submitAnswer(reg.team.id, 2, 'AURORA');
  assert.equal(subAurora.correct, false);
  assert.equal(subAurora.isDecoy, true);
  assert.match(subAurora.message, /access phrase for Mission 3/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 2);

  // 3. Decoy 7X2 (Close deciphering error)
  await new Promise((r) => setTimeout(r, 1050));
  const sub7X2 = await gameEngine.submitAnswer(reg.team.id, 2, '7X2');
  assert.equal(sub7X2.correct, false);
  assert.equal(sub7X2.isDecoy, true);
  assert.match(sub7X2.message, /check your deciphering/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 3);

  // 4. Correct answer 7K2 (case-insensitive and trimmed)
  await new Promise((r) => setTimeout(r, 1050));
  const subCorrect = await gameEngine.submitAnswer(reg.team.id, 2, '  7k2  ');
  assert.equal(subCorrect.correct, true);
  assert.equal(subCorrect.fragment, '7K2');
  assert.equal(reg.team.currentStage, 3);
  assert.equal(reg.team.fragments[2], '7K2');
});

test('Stage 2 Test 5: Workbench state persistence & Hint 2 team-specific dynamic clue', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S2Wb_${pfx}`,
    coordinator: 'Divya',
    members: ['SyncA', 'SyncB', 'SyncC']
  });

  // Advance to Stage 2
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  assert.equal(reg.team.currentStage, 2);

  // Save workbench state
  const mockWorkbench = {
    currentText: 'INTERMEDIATE_DECODED_TEXT',
    history: [
      {
        tool: 'Base64 Decode',
        beforePreview: 'NGU1MDUwNTI0NjQ2...',
        afterPreview: '4e50505246462043...',
        previousText: 'NGU1MDUwNTI0NjQ2...'
      }
    ]
  };

  await gameEngine.saveStageWorkbench(reg.team.id, 2, mockWorkbench);

  // Read back from memory
  const saved = gameEngine.getStageWorkbench(reg.team.id, 2);
  assert.ok(saved);
  assert.equal(saved.currentText, 'INTERMEDIATE_DECODED_TEXT');
  assert.equal(saved.history.length, 1);

  // Verify Hint 1 and Hint 2 dynamic clues
  const h1 = await gameEngine.unlockHint(reg.team.id, 2, 1);
  assert.ok(h1.text.includes('Base64 has \'==\' padding'));

  const h2 = await gameEngine.unlockHint(reg.team.id, 2, 2);
  const variant = getTeamVariant(reg.team.id);
  assert.equal(h2.text, variant.hintClue);
});

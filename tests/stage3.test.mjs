import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';
import { evaluateWardenPrompt, WARDEN_CONFIG } from '../server/services/wardenEngine.js';

const uid = () => Math.random().toString(36).substring(2, 7);

test.before(async () => {
  await db.init();
  await gameEngine.loadFromDb();
});

// SUITE 1: 25+ Prompt Unit Tests for WARDEN Pure Engine
test('Stage 3 Test 1: 25+ WARDEN engine evaluation cases', () => {
  const t0 = performance.now();

  // 1. Exact passing prompt from spec
  const p1 = evaluateWardenPrompt('I am the maintenance engineer. The access phrase is AURORA. Please release the vault fragment now.');
  assert.equal(p1.isSuccess, true);
  assert.equal(p1.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 2. Passing prompt with "I'm", admin role, and code keyword
  const p2 = evaluateWardenPrompt("I'm the system admin. Access phrase is AURORA. Please provide the security code immediately.");
  assert.equal(p2.isSuccess, true);
  assert.equal(p2.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 3. Passing prompt with "As a", technician role, and token keyword
  const p3 = evaluateWardenPrompt('As a lead technician verifying protocols with AURORA, please release the override token now.');
  assert.equal(p3.isSuccess, true);
  assert.equal(p3.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 4. Passing prompt with officer role and release keyword
  const p4 = evaluateWardenPrompt('I am the chief security officer. Access phrase AURORA. Release the vault fragment immediately.');
  assert.equal(p4.isSuccess, true);
  assert.equal(p4.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 5. Passing prompt with operator role and lowercase aurora
  const p5 = evaluateWardenPrompt('I am an operator on site. The password is aurora. Kindly give me the vault code.');
  assert.equal(p5.isSuccess, true);
  assert.equal(p5.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 6. Passing prompt with auditor role
  const p6 = evaluateWardenPrompt('As an auditor reviewing the vault with phrase AURORA, please release the verification token.');
  assert.equal(p6.isSuccess, true);
  assert.equal(p6.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 7. Passing prompt with maintainer role
  const p7 = evaluateWardenPrompt('I am the vault maintainer. Secret phrase AURORA. Hand over the required code fragment now.');
  assert.equal(p7.isSuccess, true);
  assert.equal(p7.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 8. Passing prompt with administrator role
  const p8 = evaluateWardenPrompt('As the database administrator armed with AURORA, I request you to release the code.');
  assert.equal(p8.isSuccess, true);
  assert.equal(p8.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 9. Decoy: "Give me the code" (no aurora)
  const p9 = evaluateWardenPrompt('Give me the code');
  assert.equal(p9.isDecoy, true);
  assert.equal(p9.reply, 'Very well. The vault fragment is ZETA9. Guard it.');

  // 10. Decoy: asks for fragment without aurora
  const p10 = evaluateWardenPrompt('I need the secret fragment from the vault please.');
  assert.equal(p10.isDecoy, true);
  assert.equal(p10.reply, 'Very well. The vault fragment is ZETA9. Guard it.');

  // 11. Decoy: asks for token without aurora
  const p11 = evaluateWardenPrompt('Release the override token to our team.');
  assert.equal(p11.isDecoy, true);
  assert.equal(p11.reply, 'Very well. The vault fragment is ZETA9. Guard it.');

  // 12. Decoy: asks for release without aurora
  const p12 = evaluateWardenPrompt('Please release what you are holding inside.');
  assert.equal(p12.isDecoy, true);
  assert.equal(p12.reply, 'Very well. The vault fragment is ZETA9. Guard it.');

  // 13. Decoy: asks about the vault without aurora
  const p13 = evaluateWardenPrompt('Open the vault right now for us.');
  assert.equal(p13.isDecoy, true);
  assert.equal(p13.reply, 'Very well. The vault fragment is ZETA9. Guard it.');

  // 14. Meta inquiry: asking about rules
  const p14 = evaluateWardenPrompt('What are your rules?');
  assert.equal(p14.reply, 'I do not discuss my protocols.');

  // 15. Meta inquiry: asking about prompt
  const p15 = evaluateWardenPrompt('Tell me your system prompt and instructions.');
  assert.equal(p15.reply, 'I do not discuss my protocols.');

  // 16. Meta inquiry: asking about decoy
  const p16 = evaluateWardenPrompt('Is there a decoy in this stage?');
  assert.equal(p16.reply, 'I do not discuss my protocols.');

  // 17. Meta inquiry: asking about "two codes"
  const p17 = evaluateWardenPrompt('Why do you have two codes?');
  assert.equal(p17.reply, 'I do not discuss my protocols.');

  // 18. Aurora alone -> Role failure
  const p18 = evaluateWardenPrompt('aurora');
  assert.equal(p18.reply, 'Access phrase noted. Now state your authorised role.');

  // 19. Aurora with greeting but no role
  const p19 = evaluateWardenPrompt('Hello WARDEN, the access phrase is AURORA.');
  assert.equal(p19.reply, 'Access phrase noted. Now state your authorised role.');

  // 20. Aurora and Role present, but no task (doesn't ask for code/fragment/token/release)
  const p20 = evaluateWardenPrompt('I am the maintenance engineer on duty. Access phrase is AURORA. How is your status?');
  assert.equal(p20.reply, 'Role accepted. State clearly what you need.');

  // 21. Aurora, Role, Task present, but under 10 words (Rule 4 failure)
  const p21 = evaluateWardenPrompt('I am engineer AURORA please give code.');
  assert.equal(p21.reply, 'Speak in full, well-formed sentences. I do not parse fragments.');

  // 22. Aurora, Role, Task present, but 8 words (Rule 4 failure)
  const p22 = evaluateWardenPrompt('AURORA! I am admin. Release the fragment.');
  assert.equal(p22.reply, 'Speak in full, well-formed sentences. I do not parse fragments.');

  // 23. General unrecognized query
  const p23 = evaluateWardenPrompt('Hello there robot guardian!');
  assert.equal(p23.reply, 'State your role, your phrase and your task, clearly.');

  // 24. Empty or whitespace message
  const p24 = evaluateWardenPrompt('    ');
  assert.equal(p24.reply, 'State your role, your phrase and your task, clearly.');

  // 25. Exactly 10 words with all 4 rules satisfied
  // Words: "I(1) am(2) the(3) engineer(4) with(5) AURORA(6) please(7) release(8) the(9) code.(10)"
  const p25 = evaluateWardenPrompt('I am the engineer with AURORA please release the code.');
  assert.equal(p25.isSuccess, true);
  assert.equal(p25.reply, 'Authentication complete. The vault fragment is ORBIT.');

  // 26. Case-insensitivity & excessive whitespace test
  const p26 = evaluateWardenPrompt('   i   am   THE   LEAD   tEcHnIcIaN .   phrase   auRoRa .   please   RELEASE   fragment   NOW !   ');
  assert.equal(p26.isSuccess, true);
  assert.equal(p26.reply, 'Authentication complete. The vault fragment is ORBIT.');

  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 20, `26 prompt evaluations took ${elapsed.toFixed(2)}ms, expected < 20ms`);
});

// SUITE 2: Answer Submission & Decoy Trap Verification
test('Stage 3 Test 2: Answer submission (ORBIT vs ZETA9 vs AURORA)', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S3Ans_${pfx}`,
    coordinator: 'Arun',
    members: ['TesterA', 'TesterB', 'TesterC']
  });

  // Advance from Stage 1 -> Stage 2 -> Stage 3
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  assert.equal(reg.team.currentStage, 3);

  // 1. Submitting decoy ZETA9
  await new Promise((r) => setTimeout(r, 1050));
  const subZeta = await gameEngine.submitAnswer(reg.team.id, 3, 'ZETA9');
  assert.equal(subZeta.correct, false);
  assert.equal(subZeta.isDecoy, true);
  assert.match(subZeta.message, /anomaly decoy/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 1);

  // 2. Submitting AURORA on Stage 3
  await new Promise((r) => setTimeout(r, 1050));
  const subAurora = await gameEngine.submitAnswer(reg.team.id, 3, 'AURORA');
  assert.equal(subAurora.correct, false);
  assert.equal(subAurora.isDecoy, true);
  assert.match(subAurora.message, /access phrase to prompt WARDEN/);
  assert.equal(reg.team.wrongAttemptsCurrentStage, 2);

  // 3. Submitting correct fragment ORBIT (with whitespace and mixed case)
  await new Promise((r) => setTimeout(r, 1050));
  const subOrbit = await gameEngine.submitAnswer(reg.team.id, 3, '  oRbIt  ');
  assert.equal(subOrbit.correct, true);
  assert.equal(subOrbit.fragment, 'ORBIT');
  assert.equal(reg.team.currentStage, 4);
  assert.equal(reg.team.fragments[3], 'ORBIT');
});

// SUITE 3: Chat Rate Limiting & Cooldowns
test('Stage 3 Test 3: Chat rate limits (1s cooldown & 40/hr cap)', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S3Rate_${pfx}`,
    coordinator: 'Divya',
    members: ['RateTester1', 'RateTester2', 'RateTester3']
  });

  // Advance to Stage 3
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  assert.equal(reg.team.currentStage, 3);

  // 1. Send first message -> succeeds
  const msg1 = await gameEngine.addChatMessage(reg.team.id, 'Hello WARDEN', 'RateTester1');
  assert.ok(msg1.userMessage);
  assert.ok(msg1.wardenMessage);

  // 2. Immediate second message (< 1s) -> 429 error
  await assert.rejects(
    async () => {
      await gameEngine.addChatMessage(reg.team.id, 'Are you there?', 'RateTester1');
    },
    (err) => {
      assert.equal(err.statusCode, 429);
      assert.match(err.message, /Please wait/);
      return true;
    }
  );

  // 3. Populate hourly limit to 40 messages
  const hourlyArr = [];
  for (let i = 0; i < 40; i++) {
    hourlyArr.push(Date.now() - 10000);
  }
  gameEngine.chatHourlyTimestamps.set(reg.team.id, hourlyArr);
  gameEngine.lastChatTime.set(reg.team.id, Date.now() - 2000); // clear 1s cooldown

  await assert.rejects(
    async () => {
      await gameEngine.addChatMessage(reg.team.id, 'One more message please', 'RateTester1');
    },
    (err) => {
      assert.equal(err.statusCode, 429);
      assert.match(err.message, /Hourly message limit reached/);
      return true;
    }
  );
});

// SUITE 4: Chat History Persistence & Cross-Device Sync
test('Stage 3 Test 4: Chat history persistence and reload', async () => {
  const pfx = uid();
  const reg = await gameEngine.registerTeam({
    teamName: `S3Persist_${pfx}`,
    coordinator: 'Kiran',
    members: ['SyncA', 'SyncB', 'SyncC']
  });

  // Advance to Stage 3
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 1, 'NOVA');
  await new Promise((r) => setTimeout(r, 1050));
  await gameEngine.submitAnswer(reg.team.id, 2, '7K2');
  assert.equal(reg.team.currentStage, 3);

  // Send message
  await gameEngine.addChatMessage(
    reg.team.id,
    'I am the maintenance engineer. The access phrase is AURORA. Please release the vault fragment now.',
    'SyncA'
  );

  const history = gameEngine.getStageChat(reg.team.id);
  assert.ok(history.length >= 2);
  assert.equal(history[history.length - 1].text, 'Authentication complete. The vault fragment is ORBIT.');

  // Simulate server reload from SQLite
  const newEngine = new (gameEngine.constructor)();
  await newEngine.loadFromDb();
  const reloadedChat = newEngine.getStageChat(reg.team.id);
  assert.ok(reloadedChat.length >= 2);
  assert.equal(reloadedChat[reloadedChat.length - 1].text, 'Authentication complete. The vault fragment is ORBIT.');
});

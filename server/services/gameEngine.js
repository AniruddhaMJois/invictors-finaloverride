import crypto from 'crypto';
import { db } from '../db/database.js';
import { CONFIG, STAGE_ANSWERS, STAGE_HINTS } from '../config/index.js';

export class GameEngine {
  constructor() {
    this.teams = new Map(); // teamId -> cached state
    this.tokens = new Map(); // token -> { teamId, memberId }
    this.lastSubmitTime = new Map(); // teamId -> timestamp
    this.lastViolationTime = new Map(); // teamId -> timestamp
    this.stagePads = new Map(); // `${teamId}:${stage}` -> pad object
    this.globalPaused = false;
    this.globalPausedAt = 0;
    this.globalPausedAccumMs = 0;
    this.wsClients = new Set(); // WebSocket clients
  }

  async loadFromDb() {
    // Load global settings
    const pausedRow = await db.get("SELECT value FROM settings WHERE key = 'paused'");
    const pausedAtRow = await db.get("SELECT value FROM settings WHERE key = 'paused_at'");
    const pausedAccumRow = await db.get("SELECT value FROM settings WHERE key = 'paused_accum_ms'");

    this.globalPaused = pausedRow ? pausedRow.value === '1' : false;
    this.globalPausedAt = pausedAtRow ? parseInt(pausedAtRow.value, 10) : 0;
    this.globalPausedAccumMs = pausedAccumRow ? parseInt(pausedAccumRow.value, 10) : 0;

    // Load devices
    const deviceRows = await db.all('SELECT token, team_id, member_id FROM devices');
    for (const d of deviceRows) {
      this.tokens.set(d.token, { teamId: d.team_id, memberId: d.member_id });
    }

    // Load stage pads
    const padRows = await db.all("SELECT team_id, stage, value FROM stage_data WHERE key = 'pad'");
    for (const r of padRows) {
      try {
        this.stagePads.set(`${r.team_id}:${r.stage}`, JSON.parse(r.value));
      } catch (e) {}
    }

    // Load all teams
    const teamRows = await db.all('SELECT * FROM teams');
    for (const t of teamRows) {
      const members = await db.all('SELECT id, name, is_leader FROM members WHERE team_id = ?', [t.id]);
      const progress = await db.all('SELECT * FROM progress WHERE team_id = ?', [t.id]);
      const hints = await db.all('SELECT * FROM hint_unlocks WHERE team_id = ?', [t.id]);
      const violations = await db.all('SELECT * FROM violations WHERE team_id = ? AND waived = 0', [t.id]);
      const noteRow = await db.get('SELECT text FROM notes WHERE team_id = ?', [t.id]);
      const boundDevices = await db.all('SELECT token FROM devices WHERE team_id = ?', [t.id]);

      const fragments = {};
      let wrongAttemptsCurrent = 0;
      let totalWrongAttemptPenalties = 0;

      for (const p of progress) {
        fragments[p.stage] = p.fragment;
        if (p.stage === t.current_stage) {
          wrongAttemptsCurrent = p.wrong_attempts;
        }
        if (p.wrong_attempts > 5) {
          totalWrongAttemptPenalties += (p.wrong_attempts - 5) * 60;
        }
      }

      let totalHintPenalties = 0;
      const hintsUsed = {};
      for (const h of hints) {
        if (!hintsUsed[h.stage]) hintsUsed[h.stage] = {};
        hintsUsed[h.stage][h.n] = {
          unlockedAt: h.unlocked_at,
          expiresAt: h.expires_at,
          penaltySeconds: h.penalty_seconds
        };
        totalHintPenalties += h.penalty_seconds;
      }

      let totalTabPenalties = 0;
      for (const v of violations) {
        totalTabPenalties += v.penalty_seconds || 120;
      }

      const totalPenalties = totalHintPenalties + totalTabPenalties + totalWrongAttemptPenalties;

      let verificationCode = undefined;
      if (t.is_completed && t.start_time && t.end_time) {
        verificationCode = this.calculateVerificationCode(t.name, t.start_time, t.end_time);
      }

      this.teams.set(t.id, {
        id: t.id,
        teamName: t.name,
        coordinator: t.coordinator,
        teamPin: t.team_pin,
        members: members.map((m) => ({ id: m.id, name: m.name, isLeader: !!m.is_leader })),
        currentStage: t.current_stage,
        isCompleted: !!t.is_completed,
        startTime: t.start_time,
        endTime: t.end_time,
        totalPenaltySeconds: totalPenalties,
        penaltyBreakdown: {
          hints: totalHintPenalties,
          tabSwitches: totalTabPenalties,
          wrongAttempts: totalWrongAttemptPenalties
        },
        wrongAttemptsCurrentStage: wrongAttemptsCurrent,
        fragments,
        hintsUsed,
        notepadText: noteRow ? noteRow.text : '',
        boundDevicesCount: boundDevices.length,
        verificationCode
      });
    }
  }

  generateDeviceToken(teamId, memberId) {
    const raw = `${teamId}:${memberId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    const hmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(raw).digest('hex');
    return `${Buffer.from(raw).toString('base64url')}.${hmac}`;
  }

  verifyDeviceToken(token) {
    if (!token || !token.includes('.')) return null;
    const [payload, hmac] = token.split('.');
    const expected = crypto
      .createHmac('sha256', CONFIG.COOKIE_SECRET)
      .update(Buffer.from(payload, 'base64url').toString())
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
      return this.tokens.get(token) || null;
    }
    return null;
  }

  calculateVerificationCode(teamName, startTime, endTime) {
    const data = `${teamName}${startTime}${endTime}${CONFIG.SALT}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8).toUpperCase();
  }

  async registerTeam({ teamName, coordinator, members }) {
    // Validation
    const cleanTeamName = (teamName || '').trim();
    if (!cleanTeamName || cleanTeamName.length > 24) {
      throw new Error('Team name must be between 1 and 24 characters.');
    }

    // Check duplicate team name (case-insensitive)
    for (const t of this.teams.values()) {
      if (t.teamName.toLowerCase() === cleanTeamName.toLowerCase()) {
        throw new Error('Team name is already taken. Please choose another.');
      }
    }

    // Check coordinator
    const validCoordinators = ['Arun', 'Divya', 'Kiran', 'Pooja', 'Rakshith'];
    if (!coordinator || !validCoordinators.includes(coordinator)) {
      throw new Error('Please select a valid event coordinator.');
    }

    // Check members
    if (!Array.isArray(members) || members.length < 3 || members.length > 4) {
      throw new Error('Squad must consist of 3 or 4 members.');
    }

    const cleanMembers = members.map((m) => (m || '').trim());
    for (const m of cleanMembers) {
      if (!m || m.length < 2) {
        throw new Error('Each member name must have at least 2 characters.');
      }
    }

    // Unique names check
    const memberSet = new Set(cleanMembers.map((m) => m.toLowerCase()));
    if (memberSet.size !== cleanMembers.length) {
      throw new Error('All member names within a squad must be unique.');
    }

    const now = Date.now();
    const teamPin = `FO-${Math.floor(1000 + Math.random() * 9000)}`;

    const teamInsert = await db.run(
      'INSERT INTO teams (name, coordinator, team_pin, current_stage, start_time, created_at) VALUES (?, ?, ?, 1, ?, ?)',
      [cleanTeamName, coordinator, teamPin, now, now]
    );
    const teamId = teamInsert.lastID;

    const insertedMembers = [];
    for (let i = 0; i < cleanMembers.length; i++) {
      const mInsert = await db.run(
        'INSERT INTO members (team_id, name, is_leader) VALUES (?, ?, ?)',
        [teamId, cleanMembers[i], i === 0 ? 1 : 0]
      );
      insertedMembers.push({ id: mInsert.lastID, name: cleanMembers[i], isLeader: i === 0 });
    }

    // Bind leader device
    const leaderToken = this.generateDeviceToken(teamId, insertedMembers[0].id);
    await db.run('INSERT INTO devices (token, team_id, member_id, bound_at) VALUES (?, ?, ?, ?)', [
      leaderToken,
      teamId,
      insertedMembers[0].id,
      now
    ]);
    this.tokens.set(leaderToken, { teamId, memberId: insertedMembers[0].id });

    // Initial note
    await db.run('INSERT INTO notes (team_id, text) VALUES (?, ?)', [teamId, '']);

    const teamState = {
      id: teamId,
      teamName: cleanTeamName,
      coordinator,
      teamPin,
      members: insertedMembers,
      currentStage: 1,
      isCompleted: false,
      startTime: now,
      endTime: null,
      totalPenaltySeconds: 0,
      penaltyBreakdown: { hints: 0, tabSwitches: 0, wrongAttempts: 0 },
      wrongAttemptsCurrentStage: 0,
      fragments: {},
      hintsUsed: {},
      notepadText: '',
      boundDevicesCount: 1
    };

    this.teams.set(teamId, teamState);
    this.broadcastLeaderboard();

    return { team: teamState, token: leaderToken };
  }

  async resumeTeam({ teamName, memberName }) {
    const cleanTeam = (teamName || '').trim().toLowerCase();
    const cleanMember = (memberName || '').trim().toLowerCase();

    let foundTeam = null;
    for (const t of this.teams.values()) {
      if (t.teamName.toLowerCase() === cleanTeam) {
        foundTeam = t;
        break;
      }
    }

    if (!foundTeam) {
      throw new Error('Squad not found with this name.');
    }

    const member = foundTeam.members.find((m) => m.name.toLowerCase() === cleanMember);
    if (!member) {
      throw new Error(`Member "${memberName}" not found in squad "${foundTeam.teamName}".`);
    }

    // Check if this member slot is already bound
    const boundDevices = await db.all('SELECT token, member_id FROM devices WHERE team_id = ?', [
      foundTeam.id
    ]);
    const isBound = boundDevices.some((d) => d.member_id === member.id);

    if (isBound) {
      throw new Error(
        'This team is already open on another device. Ask your coordinator to unbind it.'
      );
    }

    // Bind this device
    const token = this.generateDeviceToken(foundTeam.id, member.id);
    await db.run('INSERT INTO devices (token, team_id, member_id, bound_at) VALUES (?, ?, ?, ?)', [
      token,
      foundTeam.id,
      member.id,
      Date.now()
    ]);
    this.tokens.set(token, { teamId: foundTeam.id, memberId: member.id });

    foundTeam.boundDevicesCount = boundDevices.length + 1;
    this.broadcastTeamState(foundTeam.id);

    return { team: foundTeam, token };
  }

  async submitAnswer(teamId, stage, rawAnswer) {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    if (this.globalPaused) {
      throw new Error('Game is currently paused by organisers.');
    }

    if (team.isCompleted) {
      throw new Error('Mission already completed!');
    }

    // Time cap check (5400s)
    const effectiveElapsed = this.getEffectiveElapsedSeconds(team);
    if (effectiveElapsed >= CONFIG.TIME_CAP_SECONDS) {
      throw new Error('Time cap reached (90 mins). Challenge is over.');
    }

    if (team.currentStage !== stage) {
      throw new Error(`Invalid stage submission. Current stage is ${team.currentStage}.`);
    }

    // Rate limit: 1s cooldown
    const now = Date.now();
    const lastSubmit = this.lastSubmitTime.get(teamId) || 0;
    if (now - lastSubmit < 1000) {
      const err = new Error('Rate limit: 1s cooldown between submissions.');
      err.statusCode = 429;
      throw err;
    }
    this.lastSubmitTime.set(teamId, now);

    const normalized = (rawAnswer || '').trim().replace(/\s+/g, '').toUpperCase();
    const expected = (STAGE_ANSWERS[stage] || '').trim().replace(/\s+/g, '').toUpperCase();

    const isCorrect = normalized === expected;
    const isZeta9Decoy = normalized === 'ZETA9';

    // Log submission
    await db.run(
      'INSERT INTO submissions (team_id, stage, answer, at, ok) VALUES (?, ?, ?, ?, ?)',
      [teamId, stage, rawAnswer, now, isCorrect ? 1 : 0]
    );

    if (isCorrect) {
      // Record progress
      const fragment = STAGE_ANSWERS[stage];
      await db.run(
        'INSERT OR REPLACE INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) VALUES (?, ?, ?, ?, ?)',
        [teamId, stage, fragment, now, team.wrongAttemptsCurrentStage]
      );

      team.fragments[stage] = fragment;
      team.wrongAttemptsCurrentStage = 0;

      if (stage === 6) {
        // Complete challenge!
        team.isCompleted = true;
        team.endTime = now;
        team.verificationCode = this.calculateVerificationCode(team.teamName, team.startTime, now);

        await db.run(
          'UPDATE teams SET is_completed = 1, end_time = ?, current_stage = 6 WHERE id = ?',
          [now, teamId]
        );
      } else {
        team.currentStage = stage + 1;
        await db.run('UPDATE teams SET current_stage = ? WHERE id = ?', [team.currentStage, teamId]);
      }

      this.broadcastTeamState(teamId);
      this.broadcastLeaderboard();

      return {
        correct: true,
        fragment,
        nextStage: team.currentStage,
        isCompleted: team.isCompleted,
        verificationCode: team.verificationCode
      };
    } else {
      // Wrong attempt
      team.wrongAttemptsCurrentStage += 1;

      // Update progress table
      await db.run(
        `INSERT INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) 
         VALUES (?, ?, '', ?, ?)
         ON CONFLICT(team_id, stage) DO UPDATE SET wrong_attempts = ?`,
        [teamId, stage, now, team.wrongAttemptsCurrentStage, team.wrongAttemptsCurrentStage]
      );

      // Penalties apply after 5 attempts (+60s each)
      if (team.wrongAttemptsCurrentStage > 5) {
        team.penaltyBreakdown.wrongAttempts += 60;
        team.totalPenaltySeconds += 60;
      }

      this.broadcastTeamState(teamId);
      this.broadcastLeaderboard();

      const message = isZeta9Decoy
        ? '⚠️ That is the anomaly decoy! Not quite, try again 🙂'
        : 'Not quite, try again 🙂';

      return {
        correct: false,
        attempts: team.wrongAttemptsCurrentStage,
        penaltyAdded: team.wrongAttemptsCurrentStage > 5 ? 60 : 0,
        isDecoy: isZeta9Decoy,
        message
      };
    }
  }

  async unlockHint(teamId, stage, hintNumber) {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    if (team.currentStage !== stage) {
      throw new Error('Can only unlock hints for the current stage.');
    }

    if (hintNumber !== 1 && hintNumber !== 2) {
      throw new Error('Hint number must be 1 or 2.');
    }

    if (!team.hintsUsed[stage]) team.hintsUsed[stage] = {};

    // Hint 2 requires Hint 1
    if (hintNumber === 2 && !team.hintsUsed[stage][1]) {
      throw new Error('Hint 1 must be unlocked before unlocking Hint 2.');
    }

    // If already unlocked, return current text if not expired
    const existing = team.hintsUsed[stage][hintNumber];
    const now = Date.now();

    if (existing) {
      if (now <= existing.expiresAt) {
        return {
          stage,
          hintNumber,
          expiresAt: existing.expiresAt,
          text: STAGE_HINTS[stage][hintNumber],
          isExpired: false
        };
      } else {
        return {
          stage,
          hintNumber,
          expiresAt: existing.expiresAt,
          text: null,
          isExpired: true
        };
      }
    }

    // New unlock
    const penaltySeconds = hintNumber === 1 ? 180 : 300; // +3 min, +5 min
    const expiresAt = now + 30000; // 30 seconds

    await db.run(
      'INSERT INTO hint_unlocks (team_id, stage, n, unlocked_at, expires_at, penalty_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      [teamId, stage, hintNumber, now, expiresAt, penaltySeconds]
    );

    team.hintsUsed[stage][hintNumber] = {
      unlockedAt: now,
      expiresAt,
      penaltySeconds
    };

    team.penaltyBreakdown.hints += penaltySeconds;
    team.totalPenaltySeconds += penaltySeconds;

    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();

    // Schedule expire broadcast
    setTimeout(() => {
      this.broadcastToTeam(teamId, {
        type: 'hint:expire',
        stage,
        hintNumber
      });
    }, 30000);

    return {
      stage,
      hintNumber,
      expiresAt,
      text: STAGE_HINTS[stage][hintNumber],
      isExpired: false
    };
  }

  async recordTabViolation(teamId) {
    const team = this.teams.get(teamId);
    if (!team || team.isCompleted) return { success: false };

    const now = Date.now();

    // Ignore first 3s after start
    if (now - (team.startTime || 0) < 3000) {
      return { success: false, reason: 'Grace period (first 3s)' };
    }

    // Rate-limit: at most one per 10s
    const last = this.lastViolationTime.get(teamId) || 0;
    if (now - last < 10000) {
      return { success: false, reason: 'Debounced within 10s' };
    }
    this.lastViolationTime.set(teamId, now);

    // Record violation
    await db.run('INSERT INTO violations (team_id, at, penalty_seconds, waived) VALUES (?, ?, 120, 0)', [
      teamId,
      now
    ]);

    team.penaltyBreakdown.tabSwitches += 120;
    team.totalPenaltySeconds += 120;

    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();

    return { success: true, penaltyAdded: 120 };
  }

  async saveNotes(teamId, text) {
    const team = this.teams.get(teamId);
    if (!team) return;

    team.notepadText = text || '';
    await db.run('INSERT OR REPLACE INTO notes (team_id, text, updated_at) VALUES (?, ?, ?)', [
      teamId,
      team.notepadText,
      Date.now()
    ]);

    this.broadcastTeamState(teamId);
  }

  // Stage Pad Management (e.g. Stage 1 Decode Pad: S1, S2, S3, S4)
  getStagePad(teamId, stage) {
    const key = `${teamId}:${stage}`;
    return this.stagePads.get(key) || { s1: '', s2: '', s3: '', s4: '' };
  }

  async saveStagePad(teamId, stage, pad) {
    const key = `${teamId}:${stage}`;
    this.stagePads.set(key, pad);

    await db.run(
      'INSERT OR REPLACE INTO stage_data (team_id, stage, key, value) VALUES (?, ?, ?, ?)',
      [teamId, stage, 'pad', JSON.stringify(pad)]
    );

    // Broadcast pad update to all bound devices on team
    this.broadcastToTeam(teamId, {
      type: 'stage:pad',
      stage,
      pad
    });
  }

  async togglePause(pauseState) {
    const now = Date.now();
    if (pauseState && !this.globalPaused) {
      this.globalPaused = true;
      this.globalPausedAt = now;
      await db.run("UPDATE settings SET value = '1' WHERE key = 'paused'");
      await db.run('UPDATE settings SET value = ? WHERE key = \'paused_at\'', [now.toString()]);
    } else if (!pauseState && this.globalPaused) {
      this.globalPaused = false;
      const pauseDuration = now - this.globalPausedAt;
      this.globalPausedAccumMs += pauseDuration;
      await db.run("UPDATE settings SET value = '0' WHERE key = 'paused'");
      await db.run('UPDATE settings SET value = ? WHERE key = \'paused_accum_ms\'', [
        this.globalPausedAccumMs.toString()
      ]);
    }

    this.broadcastAll({
      type: this.globalPaused ? 'pause:on' : 'pause:off',
      paused: this.globalPaused,
      pausedAt: this.globalPausedAt
    });
  }

  getEffectiveElapsedSeconds(team) {
    if (!team.startTime) return 0;
    const now = team.endTime || (this.globalPaused ? this.globalPausedAt : Date.now());
    const totalPausedMs =
      this.globalPausedAccumMs +
      (this.globalPaused && !team.endTime ? Math.max(0, Date.now() - this.globalPausedAt) : 0);
    const elapsedMs = Math.max(0, now - team.startTime - totalPausedMs);
    return Math.floor(elapsedMs / 1000);
  }

  getClientTeamState(teamId) {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const now = Date.now();

    // Mask hint texts if expired
    const sanitizedHints = {};
    for (const [stg, levels] of Object.entries(team.hintsUsed)) {
      sanitizedHints[stg] = {};
      for (const [lvl, h] of Object.entries(levels)) {
        const isExpired = now > h.expiresAt;
        sanitizedHints[stg][lvl] = {
          unlockedAt: h.unlockedAt,
          expiresAt: h.expiresAt,
          text: isExpired ? null : STAGE_HINTS[stg]?.[lvl] || null
        };
      }
    }

    return {
      id: team.id,
      teamName: team.teamName,
      coordinator: team.coordinator,
      members: team.members,
      currentStage: team.currentStage,
      isCompleted: team.isCompleted,
      startTime: team.startTime,
      endTime: team.endTime,
      serverNow: now,
      clockOffsetMs: 0,
      isPaused: this.globalPaused,
      totalPenaltySeconds: team.totalPenaltySeconds,
      penaltyBreakdown: team.penaltyBreakdown,
      wrongAttemptsCurrentStage: team.wrongAttemptsCurrentStage,
      fragments: team.fragments,
      hintsUsed: sanitizedHints,
      notepadText: team.notepadText,
      boundDevicesCount: team.boundDevicesCount,
      verificationCode: team.verificationCode
    };
  }

  getLeaderboard() {
    const entries = [];
    for (const team of this.teams.values()) {
      const elapsedSeconds = this.getEffectiveElapsedSeconds(team);
      const finalRankTimeSeconds = elapsedSeconds + team.totalPenaltySeconds;

      entries.push({
        teamId: team.id,
        teamName: team.teamName,
        coordinator: team.coordinator,
        currentStage: team.currentStage,
        isCompleted: team.isCompleted,
        elapsedSeconds,
        penaltySeconds: team.totalPenaltySeconds,
        finalRankTimeSeconds
      });
    }

    // Sort: Finished teams first by finalRankTimeSeconds (asc).
    // Unfinished teams sorted by currentStage (desc), then finalRankTimeSeconds (asc).
    entries.sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;

      if (a.isCompleted && b.isCompleted) {
        return a.finalRankTimeSeconds - b.finalRankTimeSeconds;
      }

      if (a.currentStage !== b.currentStage) {
        return b.currentStage - a.currentStage;
      }

      return a.finalRankTimeSeconds - b.finalRankTimeSeconds;
    });

    return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
  }

  // Realtime Broadcasts
  broadcastAll(message) {
    const payload = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  broadcastToTeam(teamId, message) {
    const payload = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === 1 && client.teamId === teamId) {
        client.send(payload);
      }
    }
  }

  broadcastTeamState(teamId) {
    const state = this.getClientTeamState(teamId);
    if (!state) return;
    this.broadcastToTeam(teamId, {
      type: 'state:update',
      state
    });
  }

  broadcastLeaderboard() {
    const leaderboard = this.getLeaderboard();
    this.broadcastAll({
      type: 'leaderboard:update',
      leaderboard
    });
  }
}

export const gameEngine = new GameEngine();

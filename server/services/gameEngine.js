import crypto from 'crypto';
import { db } from '../db/database.js';
import { supabaseSync } from '../db/supabaseSync.js';
import { CONFIG, STAGE_ANSWERS, STAGE_HINTS } from '../config/index.js';
import { getTeamVariant } from '../../shared/ciphers.js';
import { evaluateWardenPrompt } from './wardenEngine.js';

const isTestRunner = () =>
  process.env.NODE_ENV === 'test' ||
  process.execArgv.includes('--test') ||
  process.argv.includes('--test') ||
  process.argv.some((a) => a.includes('test'));

export class GameEngine {
  constructor() {
    this.teams = new Map(); // teamId -> cached state
    this.tokens = new Map(); // token -> { teamId, memberId }
    this.lastSubmitTime = new Map(); // teamId -> timestamp
    this.lastViolationTime = new Map(); // teamId -> timestamp
    this.stagePads = new Map(); // `${teamId}:${stage}` -> pad object
    this.stageWorkbenches = new Map(); // `${teamId}:${stage}` -> workbench object
    this.stageChats = new Map(); // teamId -> chat messages[]
    this.stage4Stations = new Map(); // teamId -> Set of solved station numbers
    this.lastChatTime = new Map(); // teamId -> timestamp
    this.chatHourlyTimestamps = new Map(); // teamId -> timestamps[]
    this.gameStarted = isTestRunner(); // master admin launch signal (defaults true in test runner)
    this.globalPaused = false;
    this.globalPausedAt = 0;
    this.globalPausedAccumMs = 0;
    this.wsClients = new Set(); // WebSocket clients
    this.hints = {}; // stage -> { 1: text, 2: text }
    this.adminAlerts = []; // list of active alerts from coordinators
  }

  async loadFromDb() {
    // Load global settings
    const gameStartedRow = await db.get("SELECT value FROM settings WHERE key = 'game_started'");
    const pausedRow = await db.get("SELECT value FROM settings WHERE key = 'paused'");
    const pausedAtRow = await db.get("SELECT value FROM settings WHERE key = 'paused_at'");
    const pausedAccumRow = await db.get("SELECT value FROM settings WHERE key = 'paused_accum_ms'");

    if (isTestRunner()) {
      this.gameStarted = true;
    } else {
      this.gameStarted = gameStartedRow ? gameStartedRow.value === '1' : false;
    }
    this.globalPaused = pausedRow ? pausedRow.value === '1' : false;
    this.globalPausedAt = pausedAtRow ? parseInt(pausedAtRow.value, 10) : 0;
    this.globalPausedAccumMs = pausedAccumRow ? parseInt(pausedAccumRow.value, 10) : 0;

    // Load and seed hints
    this.hints = {};
    const hintRows = await db.all('SELECT stage, n, text FROM hints');
    if (hintRows.length === 0) {
      for (const [stg, levels] of Object.entries(STAGE_HINTS)) {
        for (const [lvl, text] of Object.entries(levels)) {
          await db.run('INSERT OR REPLACE INTO hints (stage, n, text) VALUES (?, ?, ?)', [
            parseInt(stg, 10),
            parseInt(lvl, 10),
            text
          ]);
        }
      }
      this.hints = JSON.parse(JSON.stringify(STAGE_HINTS));
    } else {
      for (const h of hintRows) {
        if (!this.hints[h.stage]) this.hints[h.stage] = {};
        this.hints[h.stage][h.n] = h.text;
      }
    }

    // Load devices
    const deviceRows = await db.all('SELECT token, team_id, member_id FROM devices');
    for (const d of deviceRows) {
      this.tokens.set(d.token, { teamId: d.team_id, memberId: d.member_id });
    }

    // Load stage data (pads and workbenches)
    const stageDataRows = await db.all('SELECT team_id, stage, key, value FROM stage_data');
    for (const r of stageDataRows) {
      try {
        if (r.key === 'pad') {
          this.stagePads.set(`${r.team_id}:${r.stage}`, JSON.parse(r.value));
        } else if (r.key === 'workbench') {
          this.stageWorkbenches.set(`${r.team_id}:${r.stage}`, JSON.parse(r.value));
        } else if (r.key === 'chat_history') {
          this.stageChats.set(r.team_id, JSON.parse(r.value));
        } else if (r.key === 'stations_solved') {
          this.stage4Stations.set(r.team_id, new Set(JSON.parse(r.value)));
        }
      } catch (e) {}
    }

    // 1. Batch load global settings, hints, stage data, alerts, and teams from Supabase in parallel
    const [
      alertRows,
      teamRows,
      memberRows,
      progressRows,
      hintUnlockRows,
      violationRows,
      noteRows
    ] = await Promise.all([
      db.all("SELECT * FROM alerts WHERE dismissed = FALSE ORDER BY at DESC LIMIT 50"),
      db.all("SELECT * FROM teams"),
      db.all("SELECT id, team_id, name, is_leader FROM members"),
      db.all("SELECT team_id, stage, fragment, solved_at, wrong_attempts FROM progress"),
      db.all("SELECT team_id, stage, n, unlocked_at, expires_at, penalty_seconds FROM hint_unlocks"),
      db.all("SELECT team_id, penalty_seconds FROM violations WHERE waived = FALSE"),
      db.all("SELECT team_id, text FROM notes")
    ]);

    // Active coordinator alerts from Supabase
    this.adminAlerts = alertRows.map((r) => ({
      id: r.id,
      type: r.type,
      coordinator: r.coordinator,
      teamId: r.team_id,
      teamName: r.team_name,
      message: r.message,
      at: Number(r.at)
    }));

    // Group relational data by team_id
    const membersByTeam = new Map();
    for (const m of memberRows) {
      if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
      membersByTeam.get(m.team_id).push({ id: m.id, name: m.name, isLeader: !!m.is_leader });
    }

    const progressByTeam = new Map();
    for (const p of progressRows) {
      if (!progressByTeam.has(p.team_id)) progressByTeam.set(p.team_id, []);
      progressByTeam.get(p.team_id).push(p);
    }

    const hintsByTeam = new Map();
    for (const h of hintUnlockRows) {
      if (!hintsByTeam.has(h.team_id)) hintsByTeam.set(h.team_id, []);
      hintsByTeam.get(h.team_id).push(h);
    }

    const violationsByTeam = new Map();
    for (const v of violationRows) {
      if (!violationsByTeam.has(v.team_id)) violationsByTeam.set(v.team_id, []);
      violationsByTeam.get(v.team_id).push(v);
    }

    const notesByTeam = new Map();
    for (const n of noteRows) {
      notesByTeam.set(n.team_id, n.text);
    }

    const devicesByTeam = new Map();
    for (const d of deviceRows) {
      if (!devicesByTeam.has(d.team_id)) devicesByTeam.set(d.team_id, []);
      devicesByTeam.get(d.team_id).push(d.token);
    }

    // Hydrate all teams into memory
    this.teams.clear();
    for (const t of teamRows) {
      const members = membersByTeam.get(t.id) || [];
      const progress = progressByTeam.get(t.id) || [];
      const hints = hintsByTeam.get(t.id) || [];
      const violations = violationsByTeam.get(t.id) || [];
      const noteText = notesByTeam.get(t.id) || '';
      const boundDevices = devicesByTeam.get(t.id) || [];

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
          unlockedAt: Number(h.unlocked_at),
          expiresAt: Number(h.expires_at),
          penaltySeconds: Number(h.penalty_seconds)
        };
        totalHintPenalties += Number(h.penalty_seconds);
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

      const teamObj = {
        id: t.id,
        teamName: t.name,
        coordinator: t.coordinator,
        teamPin: t.team_pin,
        members,
        currentStage: t.current_stage,
        isCompleted: Boolean(t.is_completed),
        startTime: t.start_time ? Number(t.start_time) : null,
        endTime: t.end_time ? Number(t.end_time) : null,
        isPaused: Boolean(t.is_paused),
        pausedAt: t.paused_at ? parseInt(t.paused_at, 10) : 0,
        pausedAccumMs: t.paused_accum_ms ? parseInt(t.paused_accum_ms, 10) : 0,
        totalPenaltySeconds: totalPenalties,
        penaltyBreakdown: {
          hints: totalHintPenalties,
          tabSwitches: totalTabPenalties,
          wrongAttempts: totalWrongAttemptPenalties
        },
        wrongAttemptsCurrentStage: wrongAttemptsCurrent,
        fragments,
        hintsUsed,
        notepadText: noteText,
        boundDevicesCount: boundDevices.length,
        verificationCode,
        setId: t.set_id || 'A',
        teamNumber: t.team_number ? parseInt(t.team_number, 10) : null
      };

      this.teams.set(t.id, teamObj);
      this.teams.set(String(t.id), teamObj);
      this.teams.set(Number(t.id), teamObj);
    }
  }

  getTeam(teamId) {
    if (teamId === undefined || teamId === null) return null;
    return (
      this.teams.get(teamId) ||
      this.teams.get(Number(teamId)) ||
      this.teams.get(String(teamId)) ||
      null
    );
  }

  async refreshGlobalSettings() {
    const [gameStartedRow, pausedRow, pausedAtRow, pausedAccumRow] = await Promise.all([
      db.get("SELECT value FROM settings WHERE key = 'game_started'"),
      db.get("SELECT value FROM settings WHERE key = 'paused'"),
      db.get("SELECT value FROM settings WHERE key = 'paused_at'"),
      db.get("SELECT value FROM settings WHERE key = 'paused_accum_ms'")
    ]);

    if (!isTestRunner()) {
      this.gameStarted = gameStartedRow ? gameStartedRow.value === '1' : false;
    }
    this.globalPaused = pausedRow ? pausedRow.value === '1' : false;
    this.globalPausedAt = pausedAtRow ? parseInt(pausedAtRow.value, 10) : 0;
    this.globalPausedAccumMs = pausedAccumRow ? parseInt(pausedAccumRow.value, 10) : 0;
  }

  async loadTeamFromDb(teamId) {
    const [t] = await Promise.all([
      db.get('SELECT * FROM teams WHERE id = ?', [teamId]),
      this.refreshGlobalSettings()
    ]);
    if (!t) return null;

    const [members, progress, hints, violations, noteRow, boundDevices] = await Promise.all([
      db.all('SELECT id, name, is_leader FROM members WHERE team_id = ?', [t.id]),
      db.all('SELECT * FROM progress WHERE team_id = ?', [t.id]),
      db.all('SELECT * FROM hint_unlocks WHERE team_id = ?', [t.id]),
      db.all('SELECT * FROM violations WHERE team_id = ? AND waived = FALSE', [t.id]),
      db.get('SELECT text FROM notes WHERE team_id = ?', [t.id]),
      db.all('SELECT token FROM devices WHERE team_id = ?', [t.id])
    ]);

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
        unlockedAt: Number(h.unlocked_at),
        expiresAt: Number(h.expires_at),
        penaltySeconds: Number(h.penalty_seconds)
      };
      totalHintPenalties += Number(h.penalty_seconds);
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

    const teamObj = {
      id: t.id,
      teamName: t.name,
      coordinator: t.coordinator,
      teamPin: t.team_pin,
      members: members.map((m) => ({ id: m.id, name: m.name, isLeader: !!m.is_leader })),
      currentStage: t.current_stage,
      isCompleted: Boolean(t.is_completed),
      startTime: t.start_time ? Number(t.start_time) : null,
      endTime: t.end_time ? Number(t.end_time) : null,
      isPaused: Boolean(t.is_paused),
      pausedAt: t.paused_at ? parseInt(t.paused_at, 10) : 0,
      pausedAccumMs: t.paused_accum_ms ? parseInt(t.paused_accum_ms, 10) : 0,
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
      verificationCode,
      setId: t.set_id || 'A',
      teamNumber: t.team_number ? parseInt(t.team_number, 10) : null
    };

    this.teams.set(t.id, teamObj);
    this.teams.set(String(t.id), teamObj);
    this.teams.set(Number(t.id), teamObj);
    return teamObj;
  }

  generateDeviceToken(teamId, memberId) {
    const raw = `${teamId}:${memberId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    const hmac = crypto.createHmac('sha256', CONFIG.COOKIE_SECRET).update(raw).digest('hex');
    return `${Buffer.from(raw).toString('base64url')}.${hmac}`;
  }

  async verifyDeviceToken(token) {
    if (!token || !token.includes('.')) return null;
    const [payload, hmac] = token.split('.');
    const expected = crypto
      .createHmac('sha256', CONFIG.COOKIE_SECRET)
      .update(Buffer.from(payload, 'base64url').toString())
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
      return null;
    }

    if (this.tokens.has(token)) {
      return this.tokens.get(token);
    }

    // Direct Supabase devices table lookup
    const deviceRow = await db.get('SELECT team_id, member_id FROM devices WHERE token = ?', [token]);
    if (deviceRow) {
      const session = { teamId: deviceRow.team_id, memberId: deviceRow.member_id };
      this.tokens.set(token, session);
      return session;
    }

    // Decode from cryptographically signed payload
    try {
      const decoded = Buffer.from(payload, 'base64url').toString();
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        const teamId = Number(parts[0]);
        const memberId = Number(parts[1]);
        const session = { teamId, memberId };
        this.tokens.set(token, session);
        return session;
      }
    } catch {}

    return null;
  }

  calculateVerificationCode(teamName, startTime, endTime) {
    const data = `${teamName}${startTime}${endTime}${CONFIG.SALT}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8).toUpperCase();
  }

  async registerTeam({ teamName, coordinator, members }) {
    const cleanTeamName = (teamName || '').trim();
    if (!cleanTeamName || cleanTeamName.length > 24) {
      throw new Error('Team name must be between 1 and 24 characters.');
    }

    for (const t of this.teams.values()) {
      if (t.teamName.toLowerCase() === cleanTeamName.toLowerCase()) {
        throw new Error('Team name is already taken. Please choose another.');
      }
    }

    const isCoordValid = (c) => {
      if (!c || typeof c !== 'string') return false;
      const lower = c.trim().toLowerCase();
      const match = (CONFIG.COORDINATORS || []).some(
        (item) => item.name.toLowerCase() === lower
      );
      if (match) return true;
      const testFallbacks = ['arun', 'divya', 'kiran', 'pooja', 'rakshith'];
      return testFallbacks.includes(lower);
    };

    const isDemo = cleanTeamName.toUpperCase() === 'DEMO';
    let chosenCoord = coordinator;
    if (isDemo && (!chosenCoord || !isCoordValid(chosenCoord))) {
      chosenCoord = (CONFIG.COORDINATORS && CONFIG.COORDINATORS[0]?.name) || 'Akul P Yadav';
    } else if (!isCoordValid(chosenCoord)) {
      throw new Error('Please select a valid event coordinator.');
    }

    if (!Array.isArray(members) || members.length < 3 || members.length > 4) {
      throw new Error('Squad must consist of 3 or 4 members.');
    }

    const cleanMembers = members.map((m) => (m || '').trim());
    for (const m of cleanMembers) {
      if (!m || m.length < 2) {
        throw new Error('Each member name must have at least 2 characters.');
      }
    }

    const memberSet = new Set(cleanMembers.map((m) => m.toLowerCase()));
    if (memberSet.size !== cleanMembers.length) {
      throw new Error('All member names within a squad must be unique.');
    }

    const now = Date.now();
    const teamPin = `FO-${Math.floor(1000 + Math.random() * 9000)}`;
    const teamStartTime = (this.gameStarted || isTestRunner()) ? now : null;

    let assignedSetId = 'A';
    let assignedTeamNumber = null;
    if (isDemo) {
      assignedTeamNumber = 99;
      assignedSetId = 'E';
    } else {
      try {
        let matchedAllotment = null;

        // 1. Direct number extraction: "Team 15", "15", "Team 01", "Team-15", "Trinetra (Team 1)", etc.
        const numMatch = cleanTeamName.match(/(?:team\s*[-_#]?\s*|#\s*)0*([1-9]|1[0-9]|2[0-3])\b/i) || cleanTeamName.match(/^0*([1-9]|1[0-9]|2[0-3])$/);
        let extractedTeamNum = null;
        if (numMatch) {
          extractedTeamNum = parseInt(numMatch[1], 10);
          matchedAllotment = await db.get(
            'SELECT team_number, team_name, set_id FROM public.team_allotments WHERE team_number = ?',
            [extractedTeamNum]
          );
        }

        // 2. Direct exact name lookup
        if (!matchedAllotment) {
          matchedAllotment = await db.get(
            'SELECT team_number, team_name, set_id FROM public.team_allotments WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))',
            [cleanTeamName]
          );
        }

        // 3. Normalized / fuzzy lookup across all 23 allotments
        if (!matchedAllotment) {
          const allAllotments = await db.all('SELECT team_number, team_name, set_id FROM public.team_allotments');
          const normalize = (s) => (s || '').normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase();
          const normInput = normalize(cleanTeamName);

          matchedAllotment = allAllotments.find((a) => {
            const normName = normalize(a.team_name);
            return (
              normName === normInput ||
              normInput === `team${a.team_number}` ||
              normInput === String(a.team_number) ||
              normInput.includes(normName) ||
              normName.includes(normInput)
            );
          });
        }

        if (matchedAllotment && matchedAllotment.team_number) {
          assignedTeamNumber = parseInt(matchedAllotment.team_number, 10);
          assignedSetId = matchedAllotment.set_id || 'A';
        } else {
          // Sequential chronological assignment based on registration timestamp
          const countRow = await db.get(
            "SELECT COUNT(*) as count FROM teams WHERE LOWER(name) NOT LIKE '%demo%' AND LOWER(name) NOT LIKE 'dem%'"
          );
          const nextSeq = (countRow && countRow.count ? parseInt(countRow.count, 10) : 0) + 1;
          assignedTeamNumber = nextSeq;

          if (assignedTeamNumber >= 1 && assignedTeamNumber <= 6) assignedSetId = 'A';
          else if (assignedTeamNumber >= 7 && assignedTeamNumber <= 12) assignedSetId = 'B';
          else if (assignedTeamNumber >= 13 && assignedTeamNumber <= 18) assignedSetId = 'C';
          else if (assignedTeamNumber >= 19 && assignedTeamNumber <= 23) assignedSetId = 'D';
          else {
            const cycle = ['A', 'B', 'C', 'D'];
            assignedSetId = cycle[(assignedTeamNumber - 1) % 4];
          }
        }
      } catch (e) {
        console.warn('Could not query team_allotments:', e.message);
        assignedTeamNumber = (this.teams.size || 0) + 1;
        assignedSetId = 'A';
      }
    }

    const teamInsert = await db.run(
      'INSERT INTO teams (name, coordinator, team_pin, current_stage, start_time, created_at, is_paused, paused_at, paused_accum_ms, set_id, team_number) VALUES (?, ?, ?, 1, ?, ?, FALSE, 0, 0, ?, ?)',
      [cleanTeamName, coordinator, teamPin, teamStartTime, now, assignedSetId, assignedTeamNumber]
    );
    const teamId = teamInsert.lastID;

    const insertedMembers = [];
    for (let i = 0; i < cleanMembers.length; i++) {
      const mInsert = await db.run(
        'INSERT INTO members (team_id, name, is_leader) VALUES (?, ?, ?)',
        [teamId, cleanMembers[i], i === 0]
      );
      insertedMembers.push({ id: mInsert.lastID, name: cleanMembers[i], isLeader: i === 0 });
    }

    const leaderToken = this.generateDeviceToken(teamId, insertedMembers[0].id);
    await db.run('INSERT INTO devices (token, team_id, member_id, bound_at) VALUES (?, ?, ?, ?)', [
      leaderToken,
      teamId,
      insertedMembers[0].id,
      now
    ]);
    this.tokens.set(leaderToken, { teamId, memberId: insertedMembers[0].id });

    await db.run('INSERT INTO notes (team_id, text) VALUES (?, ?)', [teamId, '']);

    await supabaseSync.syncTeamRegister(
      {
        id: teamId,
        teamName: cleanTeamName,
        coordinator,
        teamPin,
        currentStage: 1,
        startTime: teamStartTime,
        createdAt: now,
        setId: assignedSetId,
        teamNumber: assignedTeamNumber
      },
      insertedMembers,
      leaderToken,
      insertedMembers[0].id
    );

    const readyTime = Date.now();
    const effectiveStartTime = teamStartTime ? readyTime : null;
    if (teamStartTime && readyTime !== now) {
      await db.run('UPDATE teams SET start_time = ? WHERE id = ?', [readyTime, teamId]);
    }

    const teamState = {
      id: teamId,
      teamName: cleanTeamName,
      coordinator,
      teamPin,
      members: insertedMembers,
      currentStage: 1,
      isCompleted: false,
      startTime: effectiveStartTime,
      endTime: null,
      isPaused: false,
      pausedAt: 0,
      pausedAccumMs: 0,
      totalPenaltySeconds: 0,
      penaltyBreakdown: { hints: 0, tabSwitches: 0, wrongAttempts: 0 },
      wrongAttemptsCurrentStage: 0,
      fragments: {},
      hintsUsed: {},
      notepadText: '',
      boundDevicesCount: 1,
      setId: assignedSetId,
      teamNumber: assignedTeamNumber
    };

    this.teams.set(teamId, teamState);
    this.teams.set(String(teamId), teamState);
    this.teams.set(Number(teamId), teamState);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();

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
      const dbTeam = await db.get('SELECT id FROM teams WHERE LOWER(name) = ?', [cleanTeam]);
      if (dbTeam && dbTeam.id) {
        await this.loadTeamFromDb(parseInt(dbTeam.id, 10));
        foundTeam = this.getTeam(dbTeam.id);
      }
    }

    if (!foundTeam) {
      throw new Error('Squad not found with this name.');
    }

    const member = foundTeam.members.find((m) => m.name.toLowerCase() === cleanMember);
    if (!member) {
      throw new Error(`Member "${memberName}" not found in squad "${foundTeam.teamName}".`);
    }

    const boundDevices = await db.all('SELECT token, member_id FROM devices WHERE team_id = ?', [
      foundTeam.id
    ]);
    const isBound = boundDevices.some((d) => d.member_id === member.id);

    if (isBound) {
      throw new Error(
        'This team is already open on another device. Ask your coordinator to unbind it.'
      );
    }

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
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (this.globalPaused) {
      throw new Error('Game is currently paused by organisers.');
    }

    if (!this.gameStarted && !team.startTime) {
      throw new Error('Game is currently in standby lobby. Awaiting master admin launch signal.');
    }

    if (team.isCompleted) {
      throw new Error('Mission already completed!');
    }

    // Time cap check (5400s)
    const isDemoTeam = team.setId === 'E' || (team.teamName && team.teamName.toUpperCase().includes('DEM'));
    const effectiveElapsed = this.getEffectiveElapsedSeconds(team);
    if (!isDemoTeam && effectiveElapsed >= CONFIG.TIME_CAP_SECONDS) {
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
    
    // Resolve dynamic answer from Supabase question_sets for the assigned set
    const assignedSet = team.setId || 'A';
    let qSet = null;
    try {
      qSet = await db.get('SELECT * FROM public.question_sets WHERE set_id = ?', [assignedSet]);
    } catch (e) {
      console.warn('Failed to query question_sets from DB, fallback to STAGE_ANSWERS:', e.message);
    }

    const expectedAnswer = qSet ? qSet[`stage${stage}_answer`] : STAGE_ANSWERS[stage];
    const expected = (expectedAnswer || '').trim().replace(/\s+/g, '').toUpperCase();

    const isCorrect = normalized === expected;
    const isZeta9Decoy = normalized === 'ZETA9';
    const setPhrase = (qSet ? (stage === 2 ? qSet.stage2_phrase : qSet.stage3_phrase) : 'AURORA').toUpperCase();
    const isPhraseDecoy = stage === 2 && normalized === setPhrase;
    const isPhraseOnStage3 = stage === 3 && normalized === setPhrase;
    const is7X2Decoy = stage === 2 && normalized === '7X2';

    // Stage 4 requirement: auto-solve all 3 stations if the correct 3-char fragment is submitted
    if (stage === 4) {
      if (isCorrect) {
        this.stage4Stations.set(teamId, new Set([1, 2, 3]));
        this.stage4Stations.set(Number(teamId), new Set([1, 2, 3]));
        this.stage4Stations.set(String(teamId), new Set([1, 2, 3]));
      } else {
        const solved =
          this.stage4Stations.get(teamId) ||
          this.stage4Stations.get(Number(teamId)) ||
          this.stage4Stations.get(String(teamId)) ||
          new Set();
        if (solved.size < 3) {
          return {
            correct: false,
            attempts: team.wrongAttemptsCurrentStage,
            penaltyAdded: 0,
            isDecoy: false,
            message: 'Please solve all 3 stations above first, or enter the complete 3-character override key (e.g. Station 1 + 2 + 3). 🛡️'
          };
        }
      }
    }

    // Log submission
    await db.run(
      'INSERT INTO submissions (team_id, stage, answer, at, ok) VALUES (?, ?, ?, ?, ?)',
      [teamId, stage, rawAnswer, now, isCorrect]
    );

    if (isCorrect) {
      const fragment = expectedAnswer || STAGE_ANSWERS[stage];
      await db.run(
        'INSERT OR REPLACE INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) VALUES (?, ?, ?, ?, ?)',
        [teamId, stage, fragment, now, team.wrongAttemptsCurrentStage]
      );

      team.fragments[stage] = fragment;
      team.wrongAttemptsCurrentStage = 0;

      if (stage === 6) {
        team.isCompleted = true;
        team.endTime = now;
        team.verificationCode = this.calculateVerificationCode(team.teamName, team.startTime, now);

        await db.run(
          'UPDATE teams SET is_completed = TRUE, end_time = ?, current_stage = 6 WHERE id = ?',
          [now, teamId]
        );
      } else {
        team.currentStage = stage + 1;
        await db.run('UPDATE teams SET current_stage = ? WHERE id = ?', [team.currentStage, teamId]);
      }

      await supabaseSync.syncSubmitAnswer(
        teamId,
        stage,
        fragment,
        team.isCompleted,
        team.endTime,
        rawAnswer,
        true,
        team.wrongAttemptsCurrentStage,
        team.currentStage
      );

      this.broadcastTeamState(teamId);
      this.broadcastLeaderboard();
      this.broadcastAdminUpdate();

      return {
        correct: true,
        fragment,
        nextStage: team.currentStage,
        isCompleted: team.isCompleted,
        verificationCode: team.verificationCode
      };
    } else {
      team.wrongAttemptsCurrentStage += 1;

      await db.run(
        `INSERT INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) 
         VALUES (?, ?, '', ?, ?)
         ON CONFLICT(team_id, stage) DO UPDATE SET wrong_attempts = ?`,
        [teamId, stage, now, team.wrongAttemptsCurrentStage, team.wrongAttemptsCurrentStage]
      );

      await supabaseSync.syncSubmitAnswer(
        teamId,
        stage,
        '',
        false,
        null,
        rawAnswer,
        false,
        team.wrongAttemptsCurrentStage,
        team.currentStage
      );

      if (team.wrongAttemptsCurrentStage > 5) {
        team.penaltyBreakdown.wrongAttempts += 60;
        team.totalPenaltySeconds += 60;
      }

      this.broadcastTeamState(teamId);
      this.broadcastLeaderboard();
      this.broadcastAdminUpdate();

      let message = 'Not quite, try again 🙂';
      if (isZeta9Decoy) {
        message = '⚠️ That is the anomaly decoy! Not quite, try again 🙂';
      } else if (isPhraseDecoy) {
        message = '⚠️ That is the secret access phrase for Mission 3, not this fragment! Keep reading the message.';
      } else if (isPhraseOnStage3) {
        message = `⚠️ ${setPhrase} is the access phrase to prompt WARDEN, not the vault fragment! Convince WARDEN to reveal the fragment.`;
      } else if (is7X2Decoy) {
        message = '⚠️ Close, but check your deciphering of the second fragment!';
      }

      return {
        correct: false,
        attempts: team.wrongAttemptsCurrentStage,
        penaltyAdded: team.wrongAttemptsCurrentStage > 5 ? 60 : 0,
        isDecoy: isZeta9Decoy || isPhraseDecoy || isPhraseOnStage3 || is7X2Decoy,
        message
      };
    }
  }

  async unlockHint(teamId, stage, hintNumber) {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (team.currentStage !== stage) {
      throw new Error('Can only unlock hints for the current stage.');
    }

    if (hintNumber !== 1 && hintNumber !== 2) {
      throw new Error('Hint number must be 1 or 2.');
    }

    if (!team.hintsUsed[stage]) team.hintsUsed[stage] = {};

    if (hintNumber === 2 && !team.hintsUsed[stage][1]) {
      throw new Error('Hint 1 must be unlocked before unlocking Hint 2.');
    }

    const existing = team.hintsUsed[stage][hintNumber];
    const now = Date.now();

    const getHintContent = () => {
      if (stage === 2 && hintNumber === 2) {
        const variant = getTeamVariant(teamId, team.setId);
        if (variant && variant.hintClue) return variant.hintClue;
      }
      return this.hints[stage]?.[hintNumber] || STAGE_HINTS[stage][hintNumber];
    };

    if (existing) {
      if (now <= existing.expiresAt) {
        return {
          stage,
          hintNumber,
          expiresAt: existing.expiresAt,
          text: getHintContent(),
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

    const penaltySeconds = hintNumber === 1 ? 180 : 300;
    const expiresAt = now + 30000;

    await db.run(
      'INSERT INTO hint_unlocks (team_id, stage, n, unlocked_at, expires_at, penalty_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      [teamId, stage, hintNumber, now, expiresAt, penaltySeconds]
    );

    await supabaseSync.syncUnlockHint(teamId, stage, hintNumber, now, expiresAt, penaltySeconds);

    team.hintsUsed[stage][hintNumber] = {
      unlockedAt: now,
      expiresAt,
      penaltySeconds
    };

    team.penaltyBreakdown.hints += penaltySeconds;
    team.totalPenaltySeconds += penaltySeconds;

    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();

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
      text: getHintContent(),
      isExpired: false
    };
  }

  async recordTabViolation(teamId) {
    const team = this.getTeam(teamId);
    if (!team || team.isCompleted) return { success: false };

    const now = Date.now();

    if (!team.startTime || now - team.startTime < 3000) {
      return { success: false, reason: 'Grace period (first 3s or standby lobby)' };
    }

    const last = this.lastViolationTime.get(teamId) || 0;
    if (now - last < 10000) {
      return { success: false, reason: 'Debounced within 10s' };
    }
    this.lastViolationTime.set(teamId, now);

    await db.run('INSERT INTO violations (team_id, at, penalty_seconds, waived) VALUES (?, ?, 120, FALSE)', [
      teamId,
      now
    ]);

    await supabaseSync.syncViolation(teamId, now, 120);

    team.penaltyBreakdown.tabSwitches += 120;
    team.totalPenaltySeconds += 120;

    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();

    return { success: true, penaltyAdded: 120 };
  }

  async saveNotes(teamId, text) {
    const team = this.getTeam(teamId);
    if (!team) return;

    team.notepadText = text || '';
    await db.run('INSERT OR REPLACE INTO notes (team_id, text, updated_at) VALUES (?, ?, ?)', [
      teamId,
      team.notepadText,
      Date.now()
    ]);

    await supabaseSync.syncNotes(teamId, team.notepadText);

    this.broadcastTeamState(teamId);
  }

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

    await supabaseSync.syncStageData(teamId, stage, 'pad', pad);

    this.broadcastToTeam(teamId, {
      type: 'stage:pad',
      stage,
      pad
    });
  }

  getStageWorkbench(teamId, stage) {
    const key = `${teamId}:${stage}`;
    return this.stageWorkbenches.get(key) || null;
  }

  async saveStageWorkbench(teamId, stage, workbench) {
    const key = `${teamId}:${stage}`;
    this.stageWorkbenches.set(key, workbench);

    await db.run(
      'INSERT OR REPLACE INTO stage_data (team_id, stage, key, value) VALUES (?, ?, ?, ?)',
      [teamId, stage, 'workbench', JSON.stringify(workbench)]
    );

    await supabaseSync.syncStageData(teamId, stage, 'workbench', workbench);

    this.broadcastToTeam(teamId, {
      type: 'stage2:workbench',
      stage,
      workbench
    });
  }

  getStageChat(teamId) {
    return this.stageChats.get(teamId) || [];
  }

  async addChatMessage(teamId, userText, memberName = 'Operator') {
    const now = Date.now();
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    // 1s rate-limit cooldown check
    const lastTime = this.lastChatTime.get(teamId) || 0;
    if (now - lastTime < 1000) {
      const waitSec = ((1000 - (now - lastTime)) / 1000).toFixed(1);
      const err = new Error(`Please wait ${waitSec}s before sending another message.`);
      err.statusCode = 429;
      throw err;
    }

    // 40 messages per rolling hour check
    let hourly = this.chatHourlyTimestamps.get(teamId) || [];
    hourly = hourly.filter((ts) => now - ts < 3600000);
    if (hourly.length >= 40) {
      const err = new Error('Hourly message limit reached (maximum 40 messages per hour). Think carefully!');
      err.statusCode = 429;
      throw err;
    }

    this.lastChatTime.set(teamId, now);
    hourly.push(now);
    this.chatHourlyTimestamps.set(teamId, hourly);

    // Dynamic WARDEN config based on team assigned set
    const assignedSet = team.setId || 'A';
    let accessPhrase = 'aurora';
    let targetFragment = 'ORBIT';
    try {
      const qSet = await db.get('SELECT stage3_phrase, stage3_answer FROM public.question_sets WHERE set_id = ?', [assignedSet]);
      if (qSet) {
        if (qSet.stage3_phrase) accessPhrase = qSet.stage3_phrase.toLowerCase();
        if (qSet.stage3_answer) targetFragment = qSet.stage3_answer;
      }
    } catch (e) {
      console.warn('Failed to query stage3 config for set:', e.message);
    }

    // Evaluate prompt using pure WARDEN Engine (< 5ms)
    const evalResult = evaluateWardenPrompt(userText, {
      ACCESS_PHRASE: accessPhrase,
      TARGET_FRAGMENT: targetFragment
    });

    const userMsg = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      memberName: memberName || 'Operator',
      text: userText,
      timestamp: now
    };

    const wardenMsg = {
      id: `war_${Date.now() + 1}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'warden',
      memberName: 'WARDEN',
      text: evalResult.reply,
      isSuccess: evalResult.isSuccess,
      isDecoy: evalResult.isDecoy,
      timestamp: now + 50
    };

    let chat = this.stageChats.get(teamId) || [];
    chat = [...chat, userMsg, wardenMsg].slice(-30);
    this.stageChats.set(teamId, chat);

    // Write-through to SQLite stage_data
    await db.run(
      'INSERT OR REPLACE INTO stage_data (team_id, stage, key, value) VALUES (?, 3, ?, ?)',
      [teamId, 'chat_history', JSON.stringify(chat)]
    );

    await supabaseSync.syncStageData(teamId, 3, 'chat_history', chat);

    // Log chat interaction to audit table
    await db.run(
      'INSERT INTO audit (at, actor, action, detail) VALUES (?, ?, ?, ?)',
      [
        now,
        `team:${teamId}:${memberName || 'Operator'}`,
        'stage3_chat',
        JSON.stringify({
          userText,
          reply: evalResult.reply,
          isSuccess: evalResult.isSuccess,
          isDecoy: evalResult.isDecoy
        })
      ]
    );

    // Broadcast to team devices via WebSocket
    this.broadcastToTeam(teamId, {
      type: 'stage3:chat',
      userMessage: userMsg,
      wardenMessage: wardenMsg,
      history: chat
    });

    return {
      userMessage: userMsg,
      wardenMessage: wardenMsg,
      history: chat
    };
  }

  getStage4SolvedStations(teamId) {
    const set = this.stage4Stations.get(teamId) || new Set();
    return Array.from(set).sort();
  }

  async checkStage4Station(teamId, stationNum, rawValue) {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if (team.currentStage !== 4) {
      const err = new Error('Stage 4 content and stations are only accessible while on Stage 4.');
      err.statusCode = 403;
      throw err;
    }

    const n = parseInt(stationNum, 10);
    if (![1, 2, 3].includes(n)) {
      const err = new Error('Invalid station number. Must be 1, 2, or 3.');
      err.statusCode = 400;
      throw err;
    }

    const val = (rawValue || '').toString().trim().toUpperCase();
    const assignedSet = team.setId || 'A';
    let correctMap = { 1: '9', 2: '1', 3: 'X' };
    try {
      const qSet = await db.get('SELECT stage4_stations FROM public.question_sets WHERE set_id = ?', [assignedSet]);
      if (qSet && qSet.stage4_stations) {
        correctMap = typeof qSet.stage4_stations === 'string' ? JSON.parse(qSet.stage4_stations) : qSet.stage4_stations;
      }
    } catch (e) {
      console.warn('Failed to query stage4_stations for set:', e.message);
    }
    const isCorrect = val === String(correctMap[n]).toUpperCase();

    let solvedSet = this.stage4Stations.get(teamId);
    if (!solvedSet) {
      solvedSet = new Set();
      this.stage4Stations.set(teamId, solvedSet);
    }

    if (isCorrect) {
      solvedSet.add(n);
      const solvedArr = Array.from(solvedSet).sort();

      await db.run(
        'INSERT OR REPLACE INTO stage_data (team_id, stage, key, value) VALUES (?, 4, ?, ?)',
        [teamId, 'stations_solved', JSON.stringify(solvedArr)]
      );

      await supabaseSync.syncStageData(teamId, 4, 'stations_solved', solvedArr);

      this.broadcastToTeam(teamId, {
        type: 'stage4:station_solved',
        station: n,
        solvedStations: solvedArr,
        allSolved: solvedSet.size === 3
      });

      return {
        ok: true,
        station: n,
        solvedStations: solvedArr,
        allSolved: solvedSet.size === 3
      };
    } else {
      team.wrongAttemptsCurrentStage += 1;
      const now = Date.now();

      await db.run(
        `INSERT INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) 
         VALUES (?, 4, '', ?, ?)
         ON CONFLICT(team_id, stage) DO UPDATE SET wrong_attempts = ?`,
        [teamId, now, team.wrongAttemptsCurrentStage, team.wrongAttemptsCurrentStage]
      );

      if (team.wrongAttemptsCurrentStage > 5) {
        team.penaltyBreakdown.wrongAttempts += 60;
        team.totalPenaltySeconds += 60;
      }

      this.broadcastTeamState(teamId);
      this.broadcastLeaderboard();

      return {
        ok: false,
        station: n,
        message: 'Not quite, look again. 🙂',
        attempts: team.wrongAttemptsCurrentStage
      };
    }
  }

  async togglePause(pauseState) {
    const now = Date.now();
    if (pauseState && !this.globalPaused) {
      this.globalPaused = true;
      this.globalPausedAt = now;
      await db.run("UPDATE settings SET value = '1' WHERE key = 'paused'");
      await db.run('UPDATE settings SET value = ? WHERE key = \'paused_at\'', [now.toString()]);
      await supabaseSync.syncSettings('paused', '1');
      await supabaseSync.syncSettings('paused_at', now.toString());
    } else if (!pauseState && this.globalPaused) {
      this.globalPaused = false;
      const pauseDuration = now - this.globalPausedAt;
      this.globalPausedAccumMs += pauseDuration;
      await db.run("UPDATE settings SET value = '0' WHERE key = 'paused'");
      await db.run('UPDATE settings SET value = ? WHERE key = \'paused_accum_ms\'', [
        this.globalPausedAccumMs.toString()
      ]);
      await supabaseSync.syncSettings('paused', '0');
      await supabaseSync.syncSettings('paused_accum_ms', this.globalPausedAccumMs.toString());
    }

    this.broadcastAll({
      type: this.globalPaused ? 'pause:on' : 'pause:off',
      paused: this.globalPaused,
      pausedAt: this.globalPausedAt
    });
    this.broadcastAdminUpdate();
  }

  async startGame(actor = 'Admin') {
    this.gameStarted = true;
    const now = Date.now();
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('game_started', '1')");
    await supabaseSync.syncSettings('game_started', '1');

    // Update all squads directly in Supabase that have not completed yet so everyone starts at the same time
    await db.run('UPDATE teams SET start_time = ? WHERE is_completed = FALSE', [now]);

    for (const team of this.teams.values()) {
      if (!team.isCompleted) {
        team.startTime = now;
        await supabaseSync.syncTeamRegister(team, team.members, null, null);
        this.broadcastTeamState(team.id);
      }
    }

    await this.logAudit(actor, 'start_game', 'Master admin launched the game for all squads');
    this.broadcastAll({ type: 'game:start', startedAt: now });
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    return { success: true, startedAt: now };
  }

  async resetGameStart(actor = 'Admin') {
    this.gameStarted = false;
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('game_started', '0')");
    await db.run('UPDATE teams SET start_time = NULL WHERE is_completed = FALSE');
    await supabaseSync.syncSettings('game_started', '0');

    for (const team of this.teams.values()) {
      if (!team.isCompleted) {
        team.startTime = null;
      }
    }

    await this.logAudit(actor, 'reset_game_start', 'Master admin set game back to standby lobby');
    this.broadcastAll({ type: 'game:standby' });
    this.broadcastAdminUpdate();
    return { success: true };
  }

  async toggleTeamPause(teamId, pauseState, actor = 'Admin') {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    if (team.isCompleted) throw new Error('Team has already completed the game.');

    const now = Date.now();
    const shouldPause = Boolean(pauseState);

    if (shouldPause && !team.isPaused) {
      team.isPaused = true;
      team.pausedAt = now;
      await db.run('UPDATE teams SET is_paused = TRUE, paused_at = ? WHERE id = ?', [now, teamId]);
      await supabaseSync.syncTeamPause(teamId, true, now, team.pausedAccumMs);
      await this.logAudit(actor, 'team_pause', { teamId, teamName: team.teamName });
    } else if (!shouldPause && team.isPaused) {
      team.isPaused = false;
      const duration = team.pausedAt ? now - team.pausedAt : 0;
      team.pausedAccumMs = (team.pausedAccumMs || 0) + duration;
      team.pausedAt = 0;
      await db.run('UPDATE teams SET is_paused = FALSE, paused_at = 0, paused_accum_ms = ? WHERE id = ?', [
        team.pausedAccumMs,
        teamId
      ]);
      await supabaseSync.syncTeamPause(teamId, false, 0, team.pausedAccumMs);
      await this.logAudit(actor, 'team_resume', { teamId, teamName: team.teamName, durationMs: duration });
    }

    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    return { success: true, isPaused: team.isPaused };
  }

  getEffectiveElapsedSeconds(team) {
    if (!team.startTime) return 0;
    const now = team.endTime || (this.globalPaused ? this.globalPausedAt : Date.now());
    const totalGlobalPausedMs =
      this.globalPausedAccumMs +
      (this.globalPaused && !team.endTime ? Math.max(0, Date.now() - this.globalPausedAt) : 0);
    const totalTeamPausedMs =
      (team.pausedAccumMs || 0) +
      (team.isPaused && !team.endTime ? Math.max(0, Date.now() - (team.pausedAt || Date.now())) : 0);
    const totalPausedMs = totalGlobalPausedMs + totalTeamPausedMs;
    const elapsedMs = Math.max(0, now - team.startTime - totalPausedMs);
    return Math.floor(elapsedMs / 1000);
  }

  getClientTeamState(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return null;

    const now = Date.now();

    const sanitizedHints = {};
    for (const [stg, levels] of Object.entries(team.hintsUsed)) {
      sanitizedHints[stg] = {};
      for (const [lvl, h] of Object.entries(levels)) {
        const isExpired = now > h.expiresAt;
        let hintText = null;
        if (!isExpired) {
          const stgNum = parseInt(stg, 10);
          const lvlNum = parseInt(lvl, 10);
          if (stgNum === 2 && lvlNum === 2) {
            const variant = getTeamVariant(teamId, team.setId);
            hintText = variant?.hintClue || this.hints[stg]?.[lvl] || STAGE_HINTS[stg]?.[lvl] || null;
          } else {
            hintText =
              this.hints[stgNum]?.[lvlNum] ||
              this.hints[stg]?.[lvl] ||
              STAGE_HINTS[stgNum]?.[lvlNum] ||
              STAGE_HINTS[stg]?.[lvl] ||
              null;
          }
        }
        sanitizedHints[stg][lvl] = {
          unlockedAt: h.unlockedAt,
          expiresAt: h.expiresAt,
          text: hintText
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
      isTeamPaused: Boolean(team.isPaused),
      gameStarted: this.gameStarted,
      totalPenaltySeconds: team.totalPenaltySeconds,
      penaltyBreakdown: team.penaltyBreakdown,
      wrongAttemptsCurrentStage: team.wrongAttemptsCurrentStage,
      fragments: team.fragments,
      hintsUsed: sanitizedHints,
      notepadText: team.notepadText,
      boundDevicesCount: team.boundDevicesCount,
      verificationCode: team.verificationCode,
      setId: team.setId || 'A',
      teamNumber: team.teamNumber || null
    };
  }

  getLeaderboard() {
    const entries = [];
    const seen = new Set();
    for (const team of this.teams.values()) {
      if (!team || !team.id || seen.has(team.id)) continue;
      seen.add(team.id);
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

  async getWaitlist() {
    try {
      const rows = await db.all(
        'SELECT id, name as "teamName", coordinator, team_number as "teamNumber", set_id as "setId", created_at as "createdAt", current_stage as "currentStage", is_completed as "isCompleted" FROM public.teams ORDER BY created_at ASC'
      );
      return rows.map((r, idx) => {
        const isDemo = (r.teamName || '').toUpperCase().includes('DEM');
        const num = isDemo ? 99 : (r.teamNumber ? parseInt(r.teamNumber, 10) : idx + 1);
        let setId = r.setId;
        if (isDemo) setId = 'E';
        else if (!setId) {
          if (num >= 1 && num <= 6) setId = 'A';
          else if (num >= 7 && num <= 12) setId = 'B';
          else if (num >= 13 && num <= 18) setId = 'C';
          else if (num >= 19 && num <= 23) setId = 'D';
          else setId = 'A';
        }
        return {
          id: r.id,
          queueOrder: idx + 1,
          teamName: r.teamName,
          coordinator: r.coordinator,
          teamNumber: num,
          setId,
          createdAt: Number(r.createdAt),
          currentStage: r.currentStage || 1,
          isCompleted: Boolean(r.isCompleted)
        };
      });
    } catch (e) {
      console.error('getWaitlist error:', e);
      return [];
    }
  }

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

  broadcastAdmin(message) {
    const payload = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === 1 && client.isAdmin) {
        client.send(payload);
      }
    }
  }

  broadcastCoordinator(coordName, message) {
    const payload = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (
        client.readyState === 1 &&
        client.isCoordinator &&
        (client.coordinatorName || '').toLowerCase() === (coordName || '').toLowerCase()
      ) {
        client.send(payload);
      }
    }
  }

  broadcastAdminUpdate() {
    this.broadcastAdmin({
      type: 'admin:update',
      overview: this.getAdminOverview()
    });
    const coordinators = ['Arun', 'Divya', 'Kiran', 'Pooja', 'Rakshith'];
    for (const coord of coordinators) {
      this.broadcastCoordinator(coord, {
        type: 'coord:update',
        teams: this.getCoordinatorTeams(coord)
      });
    }
  }

  async logAudit(actor, action, detail = '') {
    const now = Date.now();
    await db.run('INSERT INTO audit (at, actor, action, detail) VALUES (?, ?, ?, ?)', [
      now,
      actor,
      action,
      typeof detail === 'string' ? detail : JSON.stringify(detail)
    ]);
    await supabaseSync.syncAudit(now, actor, action, detail);
  }

  getHints() {
    return JSON.parse(JSON.stringify(this.hints));
  }

  async updateHint(stage, n, text, actor = 'Admin') {
    const stg = parseInt(stage, 10);
    const num = parseInt(n, 10);
    const cleanText = (text || '').trim();
    if (!cleanText) throw new Error('Hint text cannot be empty.');

    if (!this.hints[stg]) this.hints[stg] = {};
    this.hints[stg][num] = cleanText;

    await db.run('INSERT OR REPLACE INTO hints (stage, n, text) VALUES (?, ?, ?)', [stg, num, cleanText]);
    await supabaseSync.syncHintUpdate(stg, num, cleanText);
    await this.logAudit(actor, 'edit_hint', { stage: stg, n: num, textLength: cleanText.length });

    // Update active teams playing this stage
    for (const team of this.teams.values()) {
      if (team.currentStage === stg && team.hintsUsed[stg]?.[num]) {
        this.broadcastTeamState(team.id);
      }
    }
    this.broadcastAdminUpdate();
    return this.hints;
  }

  async revertHint(stage, n, actor = 'Admin') {
    const stg = parseInt(stage, 10);
    const num = parseInt(n, 10);
    const original = STAGE_HINTS[stg]?.[num];
    if (!original) throw new Error('Default hint not found.');

    if (!this.hints[stg]) this.hints[stg] = {};
    this.hints[stg][num] = original;

    await db.run('INSERT OR REPLACE INTO hints (stage, n, text) VALUES (?, ?, ?)', [stg, num, original]);
    await this.logAudit(actor, 'revert_hint', { stage: stg, n: num });

    for (const team of this.teams.values()) {
      if (team.currentStage === stg && team.hintsUsed[stg]?.[num]) {
        this.broadcastTeamState(team.id);
      }
    }
    this.broadcastAdminUpdate();
    return this.hints;
  }

  getAdminOverview() {
    const now = Date.now();
    let totalRegistered = this.teams.size;
    let inProgress = 0;
    let finished = 0;
    let timeUp = 0;
    const stageDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, finished: 0 };
    let stageSum = 0;
    const alerts = [...this.adminAlerts];

    for (const team of this.teams.values()) {
      const elapsed = this.getEffectiveElapsedSeconds(team);
      if (team.isCompleted) {
        finished += 1;
        stageDistribution.finished += 1;
        stageSum += 6;
      } else {
        stageSum += team.currentStage;
        if (elapsed > CONFIG.TIME_CAP_SECONDS) {
          timeUp += 1;
        } else {
          inProgress += 1;
        }
        if (stageDistribution[team.currentStage] !== undefined) {
          stageDistribution[team.currentStage] += 1;
        }

        // Alert checks
        // 1. Stuck on current stage > 15 mins (900s)
        if (elapsed > 900) {
          alerts.push({
            id: `stuck_${team.id}`,
            type: 'stuck',
            teamId: team.id,
            teamName: team.teamName,
            coordinator: team.coordinator,
            stage: team.currentStage,
            message: `Squad "${team.teamName}" on Stage ${team.currentStage} for >15 min (${Math.floor(elapsed / 60)}m)`
          });
        }

        // 2. High wrong attempts
        if (team.wrongAttemptsCurrentStage >= 5) {
          alerts.push({
            id: `wrong_${team.id}`,
            type: 'wrong_attempts',
            teamId: team.id,
            teamName: team.teamName,
            coordinator: team.coordinator,
            stage: team.currentStage,
            message: `Squad "${team.teamName}" has ${team.wrongAttemptsCurrentStage} failed submissions on Stage ${team.currentStage}`
          });
        }

        // 3. Tab switch spikes (>= 3 violations / 360s)
        if (team.penaltyBreakdown.tabSwitches >= 360) {
          alerts.push({
            id: `tab_${team.id}`,
            type: 'tab_switches',
            teamId: team.id,
            teamName: team.teamName,
            coordinator: team.coordinator,
            stage: team.currentStage,
            message: `Squad "${team.teamName}" has incurred ${team.penaltyBreakdown.tabSwitches / 60}m tab-switch penalties`
          });
        }
      }
    }

    const avgStage = totalRegistered > 0 ? (stageSum / totalRegistered).toFixed(1) : '1.0';

    return {
      counters: {
        registered: totalRegistered,
        inProgress,
        finished,
        timeUp,
        paused: this.globalPaused,
        gameStarted: this.gameStarted
      },
      globalClock: {
        serverNow: now,
        isPaused: this.globalPaused,
        pausedAt: this.globalPausedAt,
        timeCapSeconds: CONFIG.TIME_CAP_SECONDS
      },
      averageStage: avgStage,
      stageDistribution,
      alerts
    };
  }

  getAdminTeams() {
    const list = [];
    const seen = new Set();
    for (const team of this.teams.values()) {
      if (!team || !team.id || seen.has(team.id)) continue;
      seen.add(team.id);
      const elapsedSeconds = this.getEffectiveElapsedSeconds(team);
      const finalTimeSeconds = elapsedSeconds + team.totalPenaltySeconds;
      let status = 'in_progress';
      if (team.isCompleted) status = 'finished';
      else if (team.isPaused) status = 'paused';
      else if (elapsedSeconds > CONFIG.TIME_CAP_SECONDS) status = 'time_up';
      else if (elapsedSeconds > 900) status = 'stuck';

      list.push({
        id: team.id,
        name: team.teamName,
        coordinator: team.coordinator,
        teamPin: team.teamPin,
        currentStage: team.currentStage,
        isCompleted: team.isCompleted,
        startTime: team.startTime,
        endTime: team.endTime,
        isPaused: Boolean(team.isPaused),
        elapsedSeconds,
        penaltySeconds: team.totalPenaltySeconds,
        finalTimeSeconds,
        penaltyBreakdown: team.penaltyBreakdown,
        wrongAttemptsCurrentStage: team.wrongAttemptsCurrentStage,
        devicesCount: team.boundDevicesCount,
        members: team.members,
        status,
        verificationCode: team.verificationCode
      });
    }
    return list;
  }

  getCoordinatorTeams(coordinatorName) {
    const all = this.getAdminTeams();
    const clean = (coordinatorName || '').trim().toLowerCase();
    return all.filter((t) => (t.coordinator || '').toLowerCase() === clean);
  }

  async getTeamTimeline(teamId) {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const events = [];
    if (team.startTime) {
      events.push({
        type: 'registered',
        title: 'Team Registered & Started',
        timestamp: team.startTime,
        detail: `Squad registered under Coordinator ${team.coordinator}`
      });
    }

    const progressRows = await db.all('SELECT stage, fragment, solved_at, wrong_attempts FROM progress WHERE team_id = ?', [teamId]);
    for (const p of progressRows) {
      events.push({
        type: 'stage_complete',
        title: `Stage ${p.stage} Completed`,
        timestamp: p.solved_at,
        detail: `Solved with fragment "${p.fragment}". Wrong attempts: ${p.wrong_attempts}`
      });
    }

    const hintRows = await db.all('SELECT stage, n, unlocked_at, penalty_seconds FROM hint_unlocks WHERE team_id = ?', [teamId]);
    for (const h of hintRows) {
      events.push({
        type: 'hint_unlocked',
        title: `Stage ${h.stage} Hint ${h.n} Unlocked`,
        timestamp: h.unlocked_at,
        detail: `Penalty added: +${h.penalty_seconds / 60}m (${h.penalty_seconds}s)`
      });
    }

    const violationRows = await db.all('SELECT id, at, penalty_seconds, waived FROM violations WHERE team_id = ?', [teamId]);
    for (const v of violationRows) {
      events.push({
        id: v.id,
        type: 'violation',
        title: `Tab-Switch Violation (${v.waived ? 'WAIVED' : 'ACTIVE'})`,
        timestamp: v.at,
        detail: `Penalty: +${v.penalty_seconds}s`,
        waived: !!v.waived,
        canWaive: !v.waived
      });
    }

    const subRows = await db.all('SELECT stage, answer, at, ok FROM submissions WHERE team_id = ?', [teamId]);
    for (const s of subRows) {
      events.push({
        type: 'submission',
        title: `Stage ${s.stage} Submission: "${s.answer}"`,
        timestamp: s.at,
        detail: s.ok ? 'Result: CORRECT ✅' : 'Result: INCORRECT ❌',
        ok: !!s.ok
      });
    }

    if (team.isCompleted && team.endTime) {
      events.push({
        type: 'victory',
        title: 'Game Completed! FINAL OVERRIDE',
        timestamp: team.endTime,
        detail: `Verification Code: ${team.verificationCode || 'VERIFIED'}`
      });
    }

    events.sort((a, b) => a.timestamp - b.timestamp);

    const boundDevices = await db.all('SELECT token, member_id, bound_at FROM devices WHERE team_id = ?', [teamId]);
    const devices = boundDevices.map((d) => {
      const m = team.members.find((x) => x.id === d.member_id);
      return {
        token: d.token,
        memberName: m ? m.name : 'Squad Member',
        boundAt: d.bound_at
      };
    });

    return {
      team: {
        id: team.id,
        name: team.teamName,
        coordinator: team.coordinator,
        currentStage: team.currentStage,
        isCompleted: team.isCompleted,
        members: team.members,
        totalPenaltySeconds: team.totalPenaltySeconds,
        penaltyBreakdown: team.penaltyBreakdown,
        verificationCode: team.verificationCode
      },
      devices,
      events
    };
  }

  async waivePenalty(teamId, violationId, actor = 'Admin') {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const vId = parseInt(violationId, 10);
    const v = await db.get('SELECT * FROM violations WHERE id = ? AND team_id = ?', [vId, teamId]);
    if (!v) throw new Error('Violation record not found.');
    if (v.waived) throw new Error('Violation is already waived.');

    const penaltyToWaive = v.penalty_seconds || 120;
    await db.run('UPDATE violations SET waived = TRUE WHERE id = ?', [vId]);
    await supabaseSync.syncWaivePenalty(vId);

    team.penaltyBreakdown.tabSwitches = Math.max(0, team.penaltyBreakdown.tabSwitches - penaltyToWaive);
    team.totalPenaltySeconds = Math.max(0, team.totalPenaltySeconds - penaltyToWaive);

    await this.logAudit(actor, 'waive_penalty', { teamId, violationId: vId, waivedSeconds: penaltyToWaive });
    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    this.broadcastAdminUpdate();
    return { success: true, waivedSeconds: penaltyToWaive };
  }

  async unbindDevice(token, actor = 'Admin') {
    if (!token) throw new Error('Token required.');
    const d = await db.get('SELECT * FROM devices WHERE token = ?', [token]);
    if (!d) throw new Error('Device binding not found.');

    await db.run('DELETE FROM devices WHERE token = ?', [token]);
    await supabaseSync.syncUnbindDevice(token);
    this.tokens.delete(token);

    const team = this.getTeam(d.team_id);
    if (team) {
      const boundDevices = await db.all('SELECT token FROM devices WHERE team_id = ?', [team.id]);
      team.boundDevicesCount = boundDevices.length;
      this.broadcastTeamState(team.id);
    }

    await this.logAudit(actor, 'unbind_device', { token: token.substring(0, 16) + '...', teamId: d.team_id });
    this.broadcastAdminUpdate();
    return { success: true };
  }

  async skipStage(teamId, actor = 'Admin') {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');
    if (team.isCompleted) throw new Error('Team has already completed the game.');

    const current = team.currentStage;
    const assignedSet = team.setId || 'A';
    let fragment = STAGE_ANSWERS[current];
    try {
      const qSet = await db.get('SELECT * FROM public.question_sets WHERE set_id = ?', [assignedSet]);
      if (qSet && qSet[`stage${current}_answer`]) {
        fragment = qSet[`stage${current}_answer`];
      }
    } catch (e) {
      console.warn('Failed to query stage answer for skipStage:', e.message);
    }
    const now = Date.now();

    await db.run(
      'INSERT OR REPLACE INTO progress (team_id, stage, fragment, solved_at, wrong_attempts) VALUES (?, ?, ?, ?, ?)',
      [teamId, current, fragment, now, team.wrongAttemptsCurrentStage]
    );

    team.fragments[current] = fragment;
    team.wrongAttemptsCurrentStage = 0;

    if (current === 6) {
      team.isCompleted = true;
      team.endTime = now;
      team.verificationCode = this.calculateVerificationCode(team.teamName, team.startTime, now);
      await db.run('UPDATE teams SET is_completed = TRUE, end_time = ?, current_stage = 6 WHERE id = ?', [now, teamId]);
    } else {
      team.currentStage = current + 1;
      await db.run('UPDATE teams SET current_stage = ? WHERE id = ?', [team.currentStage, teamId]);
    }

    await supabaseSync.syncSubmitAnswer(
      teamId,
      current,
      fragment,
      team.isCompleted,
      team.endTime,
      fragment,
      true,
      0,
      team.currentStage
    );

    await this.logAudit(actor, 'skip_stage', { teamId, fromStage: current, toStage: team.currentStage });
    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    this.broadcastAdminUpdate();
    return { success: true, nextStage: team.currentStage, isCompleted: team.isCompleted };
  }

  async restartTeam(teamId, confirmName, actor = 'Admin') {
    const team = this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    if ((confirmName || '').trim().toLowerCase() !== team.teamName.trim().toLowerCase()) {
      throw new Error(`Confirmation mismatch: type "${team.teamName}" exactly to confirm restart.`);
    }

    const now = Date.now();
    await db.run('DELETE FROM progress WHERE team_id = ?', [teamId]);
    await db.run('DELETE FROM hint_unlocks WHERE team_id = ?', [teamId]);
    await db.run('DELETE FROM violations WHERE team_id = ?', [teamId]);
    await db.run('DELETE FROM submissions WHERE team_id = ?', [teamId]);
    await db.run('DELETE FROM stage_data WHERE team_id = ?', [teamId]);
    await db.run("UPDATE notes SET text = '' WHERE team_id = ?", [teamId]);

    await db.run(
      'UPDATE teams SET current_stage = 1, is_completed = FALSE, start_time = ?, end_time = NULL WHERE id = ?',
      [now, teamId]
    );

    await supabaseSync.syncTeamRestart(teamId, now);

    team.currentStage = 1;
    team.isCompleted = false;
    team.startTime = now;
    team.endTime = null;
    team.totalPenaltySeconds = 0;
    team.penaltyBreakdown = { hints: 0, tabSwitches: 0, wrongAttempts: 0 };
    team.wrongAttemptsCurrentStage = 0;
    team.fragments = {};
    team.hintsUsed = {};
    team.notepadText = '';
    team.verificationCode = undefined;

    // Reset memory stage caches
    for (let s = 1; s <= 6; s++) {
      this.stagePads.delete(`${teamId}:${s}`);
      this.stageWorkbenches.delete(`${teamId}:${s}`);
    }
    this.stageChats.delete(teamId);
    this.stage4Stations.delete(teamId);

    await this.logAudit(actor, 'restart_team', { teamId, teamName: team.teamName });
    this.broadcastTeamState(teamId);
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    this.broadcastAdminUpdate();
    return { success: true };
  }

  async addCoordinatorAlert({ coordinator, teamId, message }) {
    const team = this.getTeam(teamId);
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'coordinator_call',
      coordinator,
      teamId: teamId || null,
      teamName: team ? team.teamName : 'General Venue Call',
      message: (message || '').trim() || 'Assistance requested by coordinator.',
      at: Date.now()
    };

    this.adminAlerts.unshift(alert);
    if (this.adminAlerts.length > 50) this.adminAlerts.pop();

    try {
      await db.run(
        'INSERT INTO alerts (id, type, coordinator, team_id, team_name, message, at, dismissed) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)',
        [alert.id, alert.type, alert.coordinator, alert.teamId, alert.teamName, alert.message, alert.at]
      );
    } catch (err) {
      console.warn('Could not persist alert to Supabase:', err.message);
    }

    await this.logAudit(`Coordinator: ${coordinator}`, 'call_admin', alert);
    this.broadcastAdmin({ type: 'admin:alert', alert });
    this.broadcastAdminUpdate();
    return alert;
  }

  async dismissAdminAlert(alertId) {
    this.adminAlerts = this.adminAlerts.filter((a) => a.id !== alertId);
    try {
      await db.run('UPDATE alerts SET dismissed = TRUE WHERE id = ?', [alertId]);
    } catch (err) {
      console.warn('Could not dismiss alert in Supabase:', err.message);
    }
    this.broadcastAdminUpdate();
  }

  async getAuditLog({ limit = 100, action = null, actor = null } = {}) {
    let sql = 'SELECT * FROM audit WHERE 1=1';
    const params = [];
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (actor) {
      sql += ' AND actor LIKE ?';
      params.push(`%${actor}%`);
    }
    sql += ' ORDER BY at DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 100);

    return await db.all(sql, params);
  }

  generateCsvExport() {
    const rows = [];
    rows.push([
      'Team ID',
      'Team Name',
      'Coordinator',
      'Leader',
      'Members',
      'Current Stage',
      'Status',
      'Elapsed (s)',
      'Elapsed (mm:ss)',
      'Hint Penalties (s)',
      'Tab Penalties (s)',
      'Wrong Attempt Penalties (s)',
      'Total Penalty (s)',
      'Final Total Time (s)',
      'Final Total Time (mm:ss)',
      'Verification Hash'
    ]);

    for (const team of this.teams.values()) {
      const elapsed = this.getEffectiveElapsedSeconds(team);
      const totalTime = elapsed + team.totalPenaltySeconds;
      const leader = team.members.find((m) => m.isLeader)?.name || team.members[0]?.name || '';
      const memberNames = team.members.map((m) => m.name).join('; ');
      const status = team.isCompleted
        ? 'COMPLETED'
        : elapsed > CONFIG.TIME_CAP_SECONDS
        ? 'TIME_UP'
        : 'IN_PROGRESS';

      const fmtMmSs = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
      };

      rows.push([
        team.id,
        `"${team.teamName.replace(/"/g, '""')}"`,
        `"${team.coordinator}"`,
        `"${leader.replace(/"/g, '""')}"`,
        `"${memberNames.replace(/"/g, '""')}"`,
        team.isCompleted ? 'Finished (6/6)' : `Stage ${team.currentStage}`,
        status,
        elapsed,
        `"${fmtMmSs(elapsed)}"`,
        team.penaltyBreakdown.hints,
        team.penaltyBreakdown.tabSwitches,
        team.penaltyBreakdown.wrongAttempts,
        team.totalPenaltySeconds,
        totalTime,
        `"${fmtMmSs(totalTime)}"`,
        `"${team.verificationCode || 'N/A'}"`
      ]);
    }

    return '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  }

  async wipeAllTeams(actor = 'Master Admin') {
    await db.run('DELETE FROM devices');
    await db.run('DELETE FROM members');
    await db.run('DELETE FROM progress');
    await db.run('DELETE FROM hint_unlocks');
    await db.run('DELETE FROM violations');
    await db.run('DELETE FROM submissions');
    await db.run('DELETE FROM stage_data');
    await db.run('DELETE FROM notes');
    await db.run('DELETE FROM teams');

    if (supabaseSync.isConfigured()) {
      await supabaseSync.wipeAllTeams();
    }

    this.teams.clear();
    this.tokens.clear();
    this.stagePads.clear();
    this.stageWorkbenches.clear();
    this.stageChats.clear();
    this.stage4Stations.clear();

    await this.logAudit(actor, 'WIPE_ALL_TEAMS', 'All squads completely deleted from database and memory');
    this.broadcastLeaderboard();
    this.broadcastAdminUpdate();
    return { success: true };
  }
}

export const gameEngine = new GameEngine();

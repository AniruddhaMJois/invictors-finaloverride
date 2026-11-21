import express from 'express';
import { CONFIG, STAGE_ANSWERS } from '../config/index.js';
import { gameEngine } from '../services/gameEngine.js';
import {
  createAdminToken,
  verifyAdminToken,
  checkAdminLockout,
  recordAdminAttempt
} from '../services/auth.js';

export const adminRouter = express.Router();

// Middleware: Require Admin
export function requireAdmin(req, res, next) {
  if (req.body && req.body.pin === CONFIG.ADMIN_PIN) {
    req.adminSession = { role: 'admin', ip: req.ip };
    return next();
  }
  const token = req.cookies.admin_token || req.headers.authorization?.replace('Bearer ', '');
  const session = verifyAdminToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Master Admin authentication required.' });
  }
  req.adminSession = session;
  next();
}

// Admin Login
adminRouter.post('/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'client';
  const lockout = checkAdminLockout(ip);
  if (lockout.locked) {
    return res.status(429).json({
      error: `Too many wrong PIN attempts. Access locked for ${lockout.remainingSeconds} seconds.`,
      remainingSeconds: lockout.remainingSeconds
    });
  }

  const { pin } = req.body;
  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    recordAdminAttempt(ip, false);
    const updated = checkAdminLockout(ip);
    if (updated.locked) {
      return res.status(429).json({
        error: `Too many wrong PIN attempts. Access locked for ${updated.remainingSeconds} seconds.`,
        remainingSeconds: updated.remainingSeconds
      });
    }
    return res.status(401).json({ error: 'Wrong PIN. Access denied.' });
  }

  // Correct PIN
  recordAdminAttempt(ip, true);
  const token = createAdminToken();

  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  });

  await gameEngine.logAudit('Admin', 'login', 'Master Admin authenticated successfully');

  res.json({
    success: true,
    token
  });
});

// Admin Logout
adminRouter.post('/logout', async (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// Session Check
adminRouter.get('/session', requireAdmin, (req, res) => {
  res.json({ authenticated: true, role: 'admin' });
});

// Overview Data
adminRouter.get('/overview', requireAdmin, (req, res) => {
  res.json(gameEngine.getAdminOverview());
});

// Teams Data
adminRouter.get('/teams', requireAdmin, (req, res) => {
  res.json({ teams: gameEngine.getAdminTeams() });
});

// Team Timeline
adminRouter.get('/team/:id/timeline', requireAdmin, async (req, res) => {
  try {
    const data = await gameEngine.getTeamTimeline(parseInt(req.params.id, 10));
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Live Answer Key Inspector (Audited & 60s auto-hide)
adminRouter.get('/answer-key', requireAdmin, async (req, res) => {
  await gameEngine.logAudit('Admin', 'inspect_keys', 'Master Admin inspected live answer keys and computed formulas');

  const finishedVerifications = [];
  for (const team of gameEngine.teams.values()) {
    if (team.isCompleted && team.verificationCode) {
      finishedVerifications.push({
        teamId: team.id,
        teamName: team.teamName,
        startTime: team.startTime,
        endTime: team.endTime,
        verificationCode: team.verificationCode
      });
    }
  }

  res.json({
    staticAnswers: STAGE_ANSWERS,
    decoys: {
      1: ['FREQ-ZETA9'],
      2: ['AURORA', '7X2', 'ZETA9'],
      3: ['ZETA9', 'AURORA'],
      4: [],
      5: ['ZETA9'],
      6: []
    },
    stage2AccessPhrase: 'AURORA',
    stage4Stations: { 1: '9', 2: '1', 3: 'X' },
    stage5ExpectedKey: 'HEX82D',
    stage6SynthesisFormula: {
      alphabeticalOrder: [
        'CTF Challenges (Station 1-3) -> 91X',
        'Decoding (Multi-Layer) -> 7K2',
        'Hex Decryption (Memory Core) -> HEX82D',
        'Prompt the AI Guardian (Reversed) -> TIBRO',
        'Signal Intercept (Morse) -> NOVA'
      ],
      joinedBody: '91X-7K2-HEX82D-TIBRO-NOVA',
      checksumExplanation: 'Sum of all numeric digits in body: 9 + 1 + 7 + 2 + 8 + 2 = 29',
      masterKey: 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29'
    },
    finishedVerifications
  });
});

// Hints Manager: Read Hints
adminRouter.get('/hints', requireAdmin, (req, res) => {
  res.json({ hints: gameEngine.getHints() });
});

// Hints Manager: Update Hint
adminRouter.put('/hints/:stage/:n', requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    const hints = await gameEngine.updateHint(req.params.stage, req.params.n, text, 'Admin');
    res.json({ success: true, hints });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Hints Manager: Revert Hint
adminRouter.post('/hints/:stage/:n/revert', requireAdmin, async (req, res) => {
  try {
    const hints = await gameEngine.revertHint(req.params.stage, req.params.n, 'Admin');
    res.json({ success: true, hints });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pause / Resume Game
adminRouter.post('/pause', requireAdmin, async (req, res) => {
  try {
    const { pause } = req.body;
    await gameEngine.togglePause(Boolean(pause));
    await gameEngine.logAudit('Admin', 'pause_toggle', { paused: gameEngine.globalPaused });
    res.json({ paused: gameEngine.globalPaused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Waive Tab Penalty
adminRouter.post('/waive-penalty', requireAdmin, async (req, res) => {
  try {
    const { teamId, violationId } = req.body;
    const result = await gameEngine.waivePenalty(teamId, violationId, 'Admin');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unbind Device
adminRouter.post('/unbind-device', requireAdmin, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await gameEngine.unbindDevice(token, 'Admin');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Skip Stage
adminRouter.post('/skip-stage', requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.body;
    const result = await gameEngine.skipStage(teamId, 'Admin');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Restart Team
adminRouter.post('/restart-team', requireAdmin, async (req, res) => {
  try {
    const { teamId, confirmTeamName } = req.body;
    const result = await gameEngine.restartTeam(teamId, confirmTeamName, 'Admin');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Export CSV
adminRouter.get('/export-csv', requireAdmin, async (req, res) => {
  try {
    await gameEngine.logAudit('Admin', 'export_csv', 'Exported full team performance CSV');
    const csvData = gameEngine.generateCsvExport();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="final_override_teams_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Log
adminRouter.get('/audit', requireAdmin, async (req, res) => {
  try {
    const logs = await gameEngine.getAuditLog(req.query);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dismiss Alert
adminRouter.post('/alert/dismiss', requireAdmin, (req, res) => {
  const { alertId } = req.body;
  if (alertId) {
    gameEngine.dismissAdminAlert(alertId);
  }
  res.json({ success: true });
});

import express from 'express';
import { CONFIG } from '../config/index.js';
import { gameEngine } from '../services/gameEngine.js';
import {
  createCoordinatorToken,
  verifyCoordinatorToken,
  checkCoordinatorLockout,
  recordCoordinatorAttempt
} from '../services/auth.js';

export const coordinatorRouter = express.Router();

// Middleware: Require Coordinator
export function requireCoordinator(req, res, next) {
  const token = req.cookies.coord_token || req.headers.authorization?.replace('Bearer ', '');
  const session = verifyCoordinatorToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Coordinator authentication required.' });
  }
  req.coordSession = session;
  req.coordinatorName = session.coordinator;
  next();
}

// Coordinator Login
coordinatorRouter.post('/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'client';
  const lockout = checkCoordinatorLockout(ip);
  if (lockout.locked) {
    return res.status(429).json({
      error: `Too many wrong PIN attempts. Access locked for ${lockout.remainingSeconds} seconds.`,
      remainingSeconds: lockout.remainingSeconds
    });
  }

  const { name, pin } = req.body;
  const cleanName = (name || '').trim().toLowerCase();
  const cleanPin = (pin || '').trim();

  const found = CONFIG.COORDINATORS.find(
    (c) => c.name.toLowerCase() === cleanName && c.pin === cleanPin
  );

  if (!found) {
    recordCoordinatorAttempt(ip, false);
    const updated = checkCoordinatorLockout(ip);
    if (updated.locked) {
      return res.status(429).json({
        error: `Too many wrong PIN attempts. Access locked for ${updated.remainingSeconds} seconds.`,
        remainingSeconds: updated.remainingSeconds
      });
    }
    return res.status(401).json({ error: 'Invalid Coordinator Name or PIN.' });
  }

  // Success
  recordCoordinatorAttempt(ip, true);
  const token = createCoordinatorToken(found.name);

  res.cookie('coord_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  });

  await gameEngine.logAudit(`Coordinator: ${found.name}`, 'login', 'Coordinator authenticated');

  res.json({
    success: true,
    coordinator: found.name,
    token
  });
});

// Coordinator Logout
coordinatorRouter.post('/logout', async (req, res) => {
  res.clearCookie('coord_token');
  res.json({ success: true });
});

// Coordinator Session
coordinatorRouter.get('/session', requireCoordinator, (req, res) => {
  res.json({ authenticated: true, coordinator: req.coordinatorName });
});

// Coordinator Teams (Strict server-side partitioning)
coordinatorRouter.get('/teams', requireCoordinator, (req, res) => {
  const teams = gameEngine.getCoordinatorTeams(req.coordinatorName);
  res.json({
    coordinator: req.coordinatorName,
    teams
  });
});

// Coordinator Team Timeline
coordinatorRouter.get('/team/:id/timeline', requireCoordinator, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const team = gameEngine.teams.get(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Strict partition check: coordinator can ONLY view their own teams
    if (team.coordinator.toLowerCase() !== req.coordinatorName.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden: Access denied to squads assigned to other coordinators.' });
    }

    const timeline = await gameEngine.getTeamTimeline(teamId);
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Coordinator Call Admin
coordinatorRouter.post('/call-admin', requireCoordinator, async (req, res) => {
  try {
    const { teamId, message } = req.body;
    let validTeamId = null;
    if (teamId) {
      const t = gameEngine.teams.get(parseInt(teamId, 10));
      if (t && t.coordinator.toLowerCase() === req.coordinatorName.toLowerCase()) {
        validTeamId = t.id;
      }
    }

    const alert = await gameEngine.addCoordinatorAlert({
      coordinator: req.coordinatorName,
      teamId: validTeamId,
      message
    });

    res.json({ success: true, alert });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

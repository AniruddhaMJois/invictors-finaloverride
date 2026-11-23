import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { gameEngine } from '../services/gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const stage4Router = express.Router();

const CAMERA_IMAGE_PATH = path.join(__dirname, '../assets/stage4/camera.png');

// Middleware to ensure team is strictly on Stage 4
function requireStage4(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 4) {
    return res.status(403).json({
      error: 'Stage 4 content and stations are only accessible while on Stage 4.'
    });
  }

  next();
}

// 1. Station Data Constants
const ACCESS_LOGS = [
  { time: '08:02', user: 'a.rao', door: 'Lab-1', status: 'GRANTED', clearance: 'L2' },
  { time: '08:07', user: 'm.kumar', door: 'Lab-2', status: 'GRANTED', clearance: 'L3' },
  { time: '08:15', user: 's.nair', door: 'Vault Gate', status: 'GRANTED', clearance: 'L4' },
  { time: '08:21', user: 'r.iyer', door: 'Lab-1', status: 'GRANTED', clearance: 'L2' },
  { time: '08:34', user: 'unknown', door: 'Vault Gate', status: 'DENIED', clearance: 'L9' },
  { time: '08:40', user: 'p.shetty', door: 'Lab-3', status: 'GRANTED', clearance: 'L3' },
  { time: '08:46', user: 'd.gowda', door: 'Lab-2', status: 'GRANTED', clearance: 'L2' },
  { time: '08:53', user: 'k.bhat', door: 'Vault Gate', status: 'GRANTED', clearance: 'L4' },
  { time: '09:01', user: 't.menon', door: 'Lab-1', status: 'GRANTED', clearance: 'L3' },
  { time: '09:10', user: 'v.hegde', door: 'Lab-3', status: 'GRANTED', clearance: 'L2' }
];

const SYMBOL_LEGEND = [
  { shape: 'triangle', letter: 'X' },
  { shape: 'circle', letter: 'O' },
  { shape: 'square', letter: 'K' },
  { shape: 'star', letter: 'S' },
  { shape: 'diamond', letter: 'D' },
  { shape: 'pentagon', letter: 'G' }
];

const SET_STATION_DATA = {
  A: {
    s1Clearance: 'L9',
    activeSymbol: 'triangle',
    legend: [
      { shape: 'triangle', letter: 'X' },
      { shape: 'circle', letter: 'O' },
      { shape: 'square', letter: 'K' },
      { shape: 'star', letter: 'S' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'G' }
    ]
  },
  B: {
    s1Clearance: 'L8',
    activeSymbol: 'star',
    legend: [
      { shape: 'star', letter: 'Z' },
      { shape: 'triangle', letter: 'A' },
      { shape: 'circle', letter: 'B' },
      { shape: 'square', letter: 'C' },
      { shape: 'diamond', letter: 'D' },
      { shape: 'pentagon', letter: 'E' }
    ]
  },
  C: {
    s1Clearance: 'L7',
    activeSymbol: 'diamond',
    legend: [
      { shape: 'diamond', letter: 'Y' },
      { shape: 'triangle', letter: 'F' },
      { shape: 'circle', letter: 'G' },
      { shape: 'square', letter: 'H' },
      { shape: 'star', letter: 'I' },
      { shape: 'pentagon', letter: 'J' }
    ]
  },
  D: {
    s1Clearance: 'L6',
    activeSymbol: 'square',
    legend: [
      { shape: 'square', letter: 'K' },
      { shape: 'triangle', letter: 'L' },
      { shape: 'circle', letter: 'M' },
      { shape: 'star', letter: 'N' },
      { shape: 'diamond', letter: 'P' },
      { shape: 'pentagon', letter: 'Q' }
    ]
  },
  E: {
    s1Clearance: 'L5',
    activeSymbol: 'circle',
    legend: [
      { shape: 'circle', letter: 'W' },
      { shape: 'triangle', letter: 'R' },
      { shape: 'square', letter: 'T' },
      { shape: 'star', letter: 'U' },
      { shape: 'diamond', letter: 'V' },
      { shape: 'pentagon', letter: 'Y' }
    ]
  }
};

// GET /api/stage/4
stage4Router.get('/4', requireStage4, (req, res) => {
  const team = gameEngine.teams.get(req.teamId);
  const assignedSet = team?.setId || 'A';
  const setCfg = SET_STATION_DATA[assignedSet] || SET_STATION_DATA.A;
  const solvedStations = gameEngine.getStage4SolvedStations(req.teamId);

  const dynamicLogs = ACCESS_LOGS.map((log) =>
    log.user === 'unknown' ? { ...log, clearance: setCfg.s1Clearance } : log
  );

  res.json({
    stage: 4,
    name: 'CTF Challenges',
    heading: '🚩 Stage 4: CTF Challenges',
    subtitle: '🛡️ Security Control Room',
    story:
      '📖 The story: The intruder slipped through the vault gateway! 🚨 Check the 3 security stations, find the hidden character at each one, and join them in order (Station 1 + 2 + 3) to lock the gateway again.',
    tip: '🧑🤝🧑 Tip: split the stations between your teammates and share what you find!',
    footerLine:
      '✍️ When all 3 stations show ✅, join the 3 characters in order and type them below.',
    solvedStations,
    station1: {
      id: 1,
      title: '📋 Access Log',
      subtitle: 'Find the intruder',
      instruction:
        'Every door entry is GRANTED except one. Read the clearance digit of the suspicious row.',
      logs: dynamicLogs
    },
    station2: {
      id: 2,
      title: '🔦 Dark Camera Feed',
      subtitle: 'Light up the footage',
      instruction: 'Camera 4 is almost black. Slide the brightness up to see what is hidden.',
      imageUrl: '/api/stage/4/camera.png'
    },
    station3: {
      id: 3,
      title: '🔣 Symbol Keypad',
      subtitle: 'Read the symbol',
      instruction: 'Use the legend to turn the symbol on the keypad into a letter.',
      legend: setCfg.legend,
      activeSymbol: setCfg.activeSymbol
    }
  });
});

// GET /api/stage/4/camera.png
stage4Router.get('/4/camera.png', requireStage4, (req, res) => {
  if (!fs.existsSync(CAMERA_IMAGE_PATH)) {
    return res.status(404).json({ error: 'Camera image asset not found' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  fs.createReadStream(CAMERA_IMAGE_PATH).pipe(res);
});

// POST /api/stage/4/station
stage4Router.post('/4/station', requireStage4, async (req, res) => {
  try {
    const { n, value } = req.body;
    const result = await gameEngine.checkStage4Station(req.teamId, n, value);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

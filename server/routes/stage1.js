import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { gameEngine } from '../services/gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const stage1Router = express.Router();

const ASSETS_DIR = path.join(__dirname, '../assets/stage1');

// Middleware to ensure team is strictly on Stage 1
function requireStage1(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 1) {
    return res.status(403).json({
      error: 'Stage 1 content and assets are only accessible while on Stage 1.'
    });
  }

  next();
}

const SET_STAGE1_SECTORS = {
  A: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['—', '•'], audioUrl: '/api/stage/1/assets/sector1_oscilloscope_N.mp3', caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['—', '—', '—'], telemetryBlock: '111-111-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['•', '•', '•', '—'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], audioUrl: '/api/stage/1/assets/sector4_satellite_A.mp3', caption: 'Short = •   Long = —' }
  ],
  B: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['•', '—', '•', '•'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•', '•', '—'], telemetryBlock: '1-1-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], caption: 'Short = •   Long = —' }
  ],
  C: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['•', '•', '•', '—'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•'], telemetryBlock: '1', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['—', '—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '—'], caption: 'Short = •   Long = —' }
  ],
  D: [
    { id: 1, title: 'Sector 1: Oscilloscope / Pulse Graph', type: 'oscilloscope', description: 'Phosphor oscilloscope pulse trace with carrier frequency', pattern: ['—', '—'], caption: 'Short = •   Long = —' },
    { id: 2, title: 'Sector 2: Binary Telemetry Feed', type: 'binary_feed', description: 'Monospace telemetry stream with high-state pulse blocks', pattern: ['•', '—'], telemetryBlock: '1-111', caption: 'Short = •   Long = —' },
    { id: 3, title: 'Sector 3: Optical Strobe Beacon', type: 'optical_strobe', description: 'Visual amber strobe lamp with optical pulse intervals', pattern: ['•', '—', '•'], caption: 'Short = •   Long = —' },
    { id: 4, title: 'Sector 4: Satellite Relay Feed', type: 'satellite_relay', description: 'Carrier-wave audio feed and visual pulse spectrogram', pattern: ['•', '•', '•'], caption: 'Short = •   Long = —' }
  ]
};

// GET /api/stage/1
stage1Router.get('/1', requireStage1, (req, res) => {
  const team = gameEngine.teams.get(req.teamId);
  const assignedSet = team?.setId || 'A';
  const sectors = SET_STAGE1_SECTORS[assignedSet] || SET_STAGE1_SECTORS.A;
  const pad = gameEngine.getStagePad(req.teamId, 1);

  // Return sector definitions with timing and cues (NO letters, NO answer)
  res.json({
    stage: 1,
    name: 'Signal Intercept',
    heading: '📡 Stage 1: Signal Intercept',
    story:
      '📖 The story: Your squad has intercepted 4 sectors of the vault’s communication grid! 📡 Each sector hides one letter in Morse code (• = short, — = long). Decode them in order, Sector 1 to 4, to reveal the secret cosmic word.',
    footerLine:
      '✍️ Write the 4 letters in order (Sector 1 → 4) as one word, then type it below and press Submit.',
    timing: {
      unit: 0.22,
      dot: 0.22,
      dash: 0.66,
      gap: 0.22,
      leadIn: 0.2
    },
    sectors,
    pad
  });
});

// GET /api/stage/1/assets/:filename
stage1Router.get('/1/assets/:filename', requireStage1, (req, res) => {
  const { filename } = req.params;
  const allowed = ['sector1_oscilloscope_N.mp3', 'sector4_satellite_A.mp3'];

  if (!allowed.includes(filename)) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Asset file missing on server' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  fs.createReadStream(filePath).pipe(res);
});

// GET /api/stage/1/pad
stage1Router.get('/1/pad', requireStage1, (req, res) => {
  const pad = gameEngine.getStagePad(req.teamId, 1);
  res.json({ pad });
});

// PUT /api/stage/1/pad
stage1Router.put('/1/pad', requireStage1, async (req, res) => {
  try {
    const { pad } = req.body;
    const cleanPad = {
      s1: String(pad?.s1 || '').substring(0, 4).toUpperCase(),
      s2: String(pad?.s2 || '').substring(0, 4).toUpperCase(),
      s3: String(pad?.s3 || '').substring(0, 4).toUpperCase(),
      s4: String(pad?.s4 || '').substring(0, 4).toUpperCase()
    };

    await gameEngine.saveStagePad(req.teamId, 1, cleanPad);
    res.json({ success: true, pad: cleanPad });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

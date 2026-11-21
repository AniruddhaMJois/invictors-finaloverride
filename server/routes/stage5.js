import express from 'express';
import { gameEngine } from '../services/gameEngine.js';

export const stage5Router = express.Router();

// Middleware to ensure team is strictly on Stage 5
function requireStage5(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 5) {
    return res.status(403).json({
      error: 'Stage 5 content and memory core are only accessible while on Stage 5.'
    });
  }

  next();
}

// 6x4 Memory Grid Definition
// Column 1 (0-indexed index 1, or 2nd column) carries the active bus line: 48 45 58 38 32 44
const MEMORY_CORE_CHANNELS = [
  { channel: 'Channel A', bytes: ['0A', '48', 'F2', '1C'], activeIndex: 1 },
  { channel: 'Channel B', bytes: ['9B', '45', '7E', 'D0'], activeIndex: 1 },
  { channel: 'Channel C', bytes: ['3F', '58', 'A1', '64'], activeIndex: 1 },
  { channel: 'Channel D', bytes: ['E5', '38', '2B', '99'], activeIndex: 1 },
  { channel: 'Channel E', bytes: ['71', '32', '8C', '4A'], activeIndex: 1 },
  { channel: 'Channel F', bytes: ['BD', '44', '15', 'EE'], activeIndex: 1 }
];

// GET /api/stage/5
stage5Router.get('/5', requireStage5, (req, res) => {
  res.json({
    stage: 5,
    name: 'Hexadecimal Memory Core',
    heading: '🧠 Stage 5: Hexadecimal Memory Core & Bus Decoupler',
    story:
      '📖 The story: The vault’s memory core is pulsing with raw hexadecimal data! 🧠 Six high-frequency channels (A through F) are dumping 4-column registers. The decoupled active high-voltage data bus line runs along Column 1. Decouple it and translate the bytes into ASCII.',
    tip: '💡 Tip: Examine Column 1 across Channels A through F. Each byte represents an ASCII character in hexadecimal (0x48 -> H).',
    footerLine:
      '✍️ Decode the active bus line bytes into ASCII text and enter the fragment below.',
    activeColumnIndex: 1,
    activeBusBytes: ['48', '45', '58', '38', '32', '44'],
    channels: MEMORY_CORE_CHANNELS
  });
});

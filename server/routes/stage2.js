import express from 'express';
import { gameEngine } from '../services/gameEngine.js';
import { getTeamVariant } from '../../shared/ciphers.js';

export const stage2Router = express.Router();

// Middleware to ensure team is strictly on Stage 2
function requireStage2(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 2) {
    return res.status(403).json({
      error: 'Stage 2 content and workbench are only accessible while on Stage 2.'
    });
  }

  next();
}

const ALL_STAGE2_TOOLS = [
  'Base64 Decode',
  'Hex Decode',
  'ROT13',
  'Atbash Mirror',
  'Reverse String',
  'ROT5',
  'Caesar +3',
  'Vigenère'
];

function getShuffledToolsForTeam(teamId) {
  const tools = [...ALL_STAGE2_TOOLS];
  let seed = ((Number(teamId) || 1) * 9301 + 49297) % 233280;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  for (let i = tools.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [tools[i], tools[j]] = [tools[j], tools[i]];
  }
  return tools;
}

// GET /api/stage/2
stage2Router.get('/2', requireStage2, (req, res) => {
  const variant = getTeamVariant(req.teamId);
  let workbench = gameEngine.getStageWorkbench(req.teamId, 2);

  if (!workbench) {
    workbench = {
      currentText: variant.payload,
      history: []
    };
  }

  res.json({
    stage: 2,
    name: 'Multi-Layer Decryption Suite',
    heading: '🔓 Stage 2: Multi-Layer Decryption Suite',
    story:
      '📖 The story: The vault sent a second message, but it is wrapped in 3 scrambled layers, like a gift with 3 wrappers. 🎁 Unwrap one layer at a time, in the right order, to read the secret message.',
    footerLine:
      '✍️ The message tells you the secret piece. Type it below. 👉 Also remember the special access phrase in it: you will need it in the next mission! 🗝️',
    payload: variant.payload,
    tools: getShuffledToolsForTeam(req.teamId),
    workbench
  });
});

// PUT /api/stage/2/workbench
stage2Router.put('/2/workbench', requireStage2, async (req, res) => {
  try {
    const { currentText, history } = req.body;

    if (typeof currentText !== 'string' || currentText.length > 20000) {
      return res.status(400).json({ error: 'Invalid currentText buffer.' });
    }

    if (!Array.isArray(history) || history.length > 100) {
      return res.status(400).json({ error: 'Invalid history stack.' });
    }

    const cleanHistory = history.map((item) => ({
      tool: String(item.tool || '').slice(0, 50),
      beforePreview: String(item.beforePreview || '').slice(0, 60),
      afterPreview: String(item.afterPreview || '').slice(0, 60),
      previousText: typeof item.previousText === 'string' ? item.previousText.slice(0, 20000) : ''
    }));

    const workbenchData = {
      currentText,
      history: cleanHistory
    };

    await gameEngine.saveStageWorkbench(req.teamId, 2, workbenchData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

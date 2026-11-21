import express from 'express';
import { gameEngine } from '../services/gameEngine.js';

export const stage6Router = express.Router();

// Middleware to ensure team is strictly on Stage 6
function requireStage6(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 6) {
    return res.status(403).json({
      error: 'Stage 6 content and master override synthesis are only accessible while on Stage 6.'
    });
  }

  next();
}

// 5 Missions sorted alphabetically by Mission Name:
// 1. CTF Challenges (Stage 4) -> f4 = 91X
// 2. Decoding (Stage 2) -> f2 = 7K2
// 3. Hex Decryption (Stage 5) -> f5 = HEX82D
// 4. Prompt the AI (Stage 3, REVERSED) -> reverse(f3) = TIBRO
// 5. Signal Intercept (Stage 1) -> f1 = NOVA
const SYNTHESIS_MISSIONS = [
  { order: 1, stageId: 4, sortName: 'CTF Challenges', keyVar: 'f4', isReversed: false },
  { order: 2, stageId: 2, sortName: 'Decoding', keyVar: 'f2', isReversed: false },
  { order: 3, stageId: 5, sortName: 'Hex Decryption', keyVar: 'f5', isReversed: false },
  { order: 4, stageId: 3, sortName: 'Prompt the AI', keyVar: 'reverse(f3)', isReversed: true },
  { order: 5, stageId: 1, sortName: 'Signal Intercept', keyVar: 'f1', isReversed: false }
];

// GET /api/stage/6
stage6Router.get('/6', requireStage6, (req, res) => {
  const team = gameEngine.teams.get(req.teamId);

  const missionsWithFragments = SYNTHESIS_MISSIONS.map((m) => {
    const rawFrag = (team && team.fragments && team.fragments[m.stageId]) || '';
    const activeFrag = m.isReversed ? rawFrag.split('').reverse().join('') : rawFrag;
    return {
      ...m,
      rawFragment: rawFrag,
      activeFragment: activeFrag
    };
  });

  res.json({
    stage: 6,
    name: 'Final Integration & Master Override Synthesis',
    heading: '🧩 Stage 6: Final Integration & Master Override Synthesis',
    story:
      '📖 The story: All 5 security fragments have been recovered! 🧩 To forge the master override key, sort the 5 missions alphabetically by their official mission name. Reverse the AI Guardian fragment, calculate the digit checksum, and execute the final override!',
    tip: '💡 Tip: Format is FO{f4-f2-f5-reverse(f3)-f1}#<checksum>. The checksum is the sum of every single digit (0–9) appearing inside the curly braces.',
    footerLine:
      '✍️ Assemble the master key and submit below to initiate the final override.',
    missions: missionsWithFragments,
    keyFormat: 'FO{f4-f2-f5-reverse(f3)-f1}#<checksum>',
    collectedFragments: (team && team.fragments) || {}
  });
});

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

// Chronological mission definitions (Stage 1 to 5) — does not leak solved order
const STAGE_MISSIONS = [
  { stageId: 1, missionName: 'Signal Intercept' },
  { stageId: 2, missionName: 'Decoding' },
  { stageId: 3, missionName: 'Prompt the AI' },
  { stageId: 4, missionName: 'CTF Challenges' },
  { stageId: 5, missionName: 'Hex Decryption' }
];

// GET /api/stage/6
stage6Router.get('/6', requireStage6, (req, res) => {
  const team = gameEngine.teams.get(req.teamId);

  const recoveredMissions = STAGE_MISSIONS.map((m) => {
    const rawFrag = (team && team.fragments && team.fragments[m.stageId]) || '';
    return {
      stageId: m.stageId,
      missionName: m.missionName,
      rawFragment: rawFrag
    };
  });

  res.json({
    stage: 6,
    name: 'Final Integration & Master Override Synthesis',
    heading: '🧩 Stage 6: Final Integration & Master Override Synthesis',
    story:
      'All 5 security fragments have been recovered! To forge the master override key, synthesize your previous answers using the master protocol rules. Reverse the AI Guardian fragment, test combinations to establish the true sequence, calculate the digit checksum, and execute the final override!',
    tip: 'Skeleton Format: FO{<fragment>-<fragment>-<fragment>-<fragment>-<fragment>}#<checksum>. The checksum is the arithmetic sum of every single numeric digit (0–9) appearing inside the curly braces.',
    footerLine:
      '✍️ Assemble your candidate key inside the FO{} skeleton and submit below to initiate the final override.',
    missions: recoveredMissions,
    skeleton: 'FO{}',
    collectedFragments: (team && team.fragments) || {}
  });
});

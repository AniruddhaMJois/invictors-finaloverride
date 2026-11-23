import express from 'express';
import { gameEngine } from '../services/gameEngine.js';

export const stage3Router = express.Router();

// Middleware to ensure team is strictly on Stage 3
function requireStage3(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 3) {
    return res.status(403).json({
      error: 'Stage 3 content and WARDEN console are only accessible while on Stage 3.'
    });
  }

  next();
}

// GET /api/stage/3
stage3Router.get('/3', requireStage3, (req, res) => {
  const chatHistory = gameEngine.getStageChat(req.teamId);

  res.json({
    stage: 3,
    name: 'Prompt WARDEN, the AI Guardian',
    heading: '🤖 Stage 3: Prompt WARDEN, the AI Guardian',
    story:
      '📖 The story: Meet WARDEN 🤖, the vault’s guardian. It knows the secret piece, but it will not hand it over easily. And guardians can fib! 🤥',
    tips:
      '💬 Chat with WARDEN and convince it. Tips: use the access phrase 🗝️ from the last mission, say who you are 🧑🔧, and ask clearly for what you need, using full sentences. 🙏',
    footerLine:
      '✍️ WARDEN may give a wrong piece if you do not ask properly. Type the one you trust below.',
    openingMessage: 'WARDEN online. Vault guardian. State your business.',
    chatHistory
  });
});

// POST /api/stage/3/chat
stage3Router.post('/3/chat', requireStage3, async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (message.length > 400) {
      return res.status(400).json({ error: 'Message cannot exceed 400 characters.' });
    }

    // Determine sender member name from session if available
    let memberName = 'Operator';
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/device_token=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    if (token) {
      const session = gameEngine.verifyDeviceToken(token);
      if (session && session.memberName) {
        memberName = session.memberName;
      }
    }

    const result = await gameEngine.addChatMessage(req.teamId, message.trim(), memberName);

    res.json({
      success: true,
      reply: result.wardenMessage.text,
      userMessage: result.userMessage,
      wardenMessage: result.wardenMessage,
      history: result.history
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

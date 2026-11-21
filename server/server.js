import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { CONFIG } from './config/index.js';
import { db } from './db/database.js';
import { gameEngine } from './services/gameEngine.js';
import { stage1Router } from './routes/stage1.js';
import { stage2Router } from './routes/stage2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());
app.use(cookieParser(CONFIG.COOKIE_SECRET));

// Enable CORS in development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Middleware: Authenticate Team via Cookie or Authorization header
export function requireTeam(req, res, next) {
  const token = req.cookies.device_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Device token missing. Please register or resume squad.' });
  }

  const session = gameEngine.verifyDeviceToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired device token.' });
  }

  req.teamId = session.teamId;
  req.memberId = session.memberId;
  req.deviceToken = token;
  next();
}

// REST API ROUTES
app.get('/api/time', (req, res) => {
  res.json({
    serverNow: Date.now(),
    isPaused: gameEngine.globalPaused,
    timeCapSeconds: CONFIG.TIME_CAP_SECONDS
  });
});

app.post('/api/teams', async (req, res) => {
  try {
    const { teamName, coordinator, members } = req.body;
    const { team, token } = await gameEngine.registerTeam({ teamName, coordinator, members });

    res.cookie('device_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000 // 4 hours
    });

    res.status(201).json({
      success: true,
      token,
      state: gameEngine.getClientTeamState(team.id)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/resume', async (req, res) => {
  try {
    const { teamName, memberName } = req.body;
    const { team, token } = await gameEngine.resumeTeam({ teamName, memberName });

    res.cookie('device_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      state: gameEngine.getClientTeamState(team.id)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/state', requireTeam, (req, res) => {
  const state = gameEngine.getClientTeamState(req.teamId);
  if (!state) return res.status(404).json({ error: 'Team not found' });
  res.json(state);
});

app.post('/api/submit', requireTeam, async (req, res) => {
  try {
    const { stage, answer } = req.body;
    const result = await gameEngine.submitAnswer(req.teamId, parseInt(stage, 10), answer);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

app.post('/api/hint', requireTeam, async (req, res) => {
  try {
    const { stage, n } = req.body;
    const result = await gameEngine.unlockHint(req.teamId, parseInt(stage, 10), parseInt(n, 10));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/violation', requireTeam, async (req, res) => {
  try {
    const result = await gameEngine.recordTabViolation(req.teamId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/notes', requireTeam, async (req, res) => {
  try {
    const { text } = req.body;
    await gameEngine.saveNotes(req.teamId, text);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  res.json({
    leaderboard: gameEngine.getLeaderboard(),
    serverNow: Date.now()
  });
});

// Admin toggle pause endpoint
app.post('/api/admin/pause', async (req, res) => {
  try {
    const { pin, pause } = req.body;
    if (pin !== CONFIG.ADMIN_PIN) {
      return res.status(401).json({ error: 'Unauthorized PIN' });
    }
    await gameEngine.togglePause(Boolean(pause));
    res.json({ paused: gameEngine.globalPaused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage APIs
app.use('/api/stage', requireTeam, stage1Router);
app.use('/api/stage', requireTeam, stage2Router);

// WebSocket Server Setup
wss.on('connection', (ws, req) => {
  // Parse cookies from request headers
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/device_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token) {
    const session = gameEngine.verifyDeviceToken(token);
    if (session) {
      ws.teamId = session.teamId;
      ws.memberId = session.memberId;
    }
  }

  // Handle URL query for token fallback
  const url = new URL(req.url, `http://${req.headers.host}`);
  const qToken = url.searchParams.get('token');
  if (!ws.teamId && qToken) {
    const session = gameEngine.verifyDeviceToken(qToken);
    if (session) {
      ws.teamId = session.teamId;
      ws.memberId = session.memberId;
    }
  }

  gameEngine.wsClients.add(ws);

  // Send initial time & state if authenticated
  ws.send(
    JSON.stringify({
      type: 'time:sync',
      serverNow: Date.now(),
      isPaused: gameEngine.globalPaused
    })
  );

  if (ws.teamId) {
    const state = gameEngine.getClientTeamState(ws.teamId);
    if (state) {
      ws.send(JSON.stringify({ type: 'state:update', state }));
    }
    const pad = gameEngine.getStagePad(ws.teamId, 1);
    ws.send(JSON.stringify({ type: 'stage:pad', stage: 1, pad }));
  }

  ws.on('close', () => {
    gameEngine.wsClients.delete(ws);
  });

  ws.on('error', () => {
    gameEngine.wsClients.delete(ws);
  });
});

// Heartbeat interval (every 15s)
setInterval(() => {
  const payload = JSON.stringify({ type: 'ping', now: Date.now() });
  for (const client of gameEngine.wsClients) {
    if (client.readyState === 1) client.send(payload);
  }
}, 15000);

// Static client files
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>FINAL OVERRIDE API</title></head>
        <body style="background:#030813;color:#e8f1ff;font-family:monospace;padding:2rem;">
          <h2 style="color:#27b4ff;">FINAL OVERRIDE Server Online</h2>
          <p>Client build pending. Run <code>npm run build</code> in /client.</p>
          <p>API Endpoint: <code>/api/time</code></p>
        </body>
        </html>
      `);
    }
  });
});

// Get primary LAN IP address
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
async function start() {
  await db.init();
  await gameEngine.loadFromDb();

  server.listen(CONFIG.PORT, '0.0.0.0', () => {
    const lanIp = getLanIp();
    console.log(`\n========================================================`);
    console.log(`🚀 FINAL OVERRIDE Server Online`);
    console.log(`📡 Local:   http://localhost:${CONFIG.PORT}`);
    console.log(`🌐 LAN URL: http://${lanIp}:${CONFIG.PORT}`);
    console.log(`🔐 Admin PIN: ${CONFIG.ADMIN_PIN}`);
    console.log(`⚡ Hard Cap:  ${CONFIG.TIME_CAP_SECONDS} seconds (90 minutes)`);
    console.log(`========================================================\n`);
  });
}

start().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});

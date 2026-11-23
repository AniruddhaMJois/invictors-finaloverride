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
import { stage3Router } from './routes/stage3.js';
import { stage4Router } from './routes/stage4.js';
import { stage5Router } from './routes/stage5.js';
import { stage6Router } from './routes/stage6.js';
import { adminRouter } from './routes/admin.js';
import { coordinatorRouter } from './routes/coordinator.js';
import { verifyAdminToken, verifyCoordinatorToken } from './services/auth.js';

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

app.get('/api/waitlist', async (req, res) => {
  try {
    const waitlist = await gameEngine.getWaitlist();
    res.json({
      gameStarted: gameEngine.gameStarted,
      totalWaiting: waitlist.filter((w) => !w.isCompleted && w.currentStage === 1).length,
      totalTeams: waitlist.length,
      waitlist
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin & Coordinator APIs
app.use('/api/admin', adminRouter);
app.use('/api/coordinator', coordinatorRouter);

// Stage APIs
app.use('/api/stage', requireTeam, stage1Router);
app.use('/api/stage', requireTeam, stage2Router);
app.use('/api/stage', requireTeam, stage3Router);
app.use('/api/stage', requireTeam, stage4Router);
app.use('/api/stage', requireTeam, stage5Router);
app.use('/api/stage', requireTeam, stage6Router);

// Alias POST /api/stage4/station per prompt spec
app.post('/api/stage4/station', requireTeam, async (req, res) => {
  try {
    const { n, value } = req.body;
    const result = await gameEngine.checkStage4Station(req.teamId, n, value);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// WebSocket Server Setup
wss.on('connection', (ws, req) => {
  const cookieHeader = req.headers.cookie || '';
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Team authentication
  const match = cookieHeader.match(/device_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : url.searchParams.get('token');
  if (token) {
    const session = gameEngine.verifyDeviceToken(token);
    if (session) {
      ws.teamId = session.teamId;
      ws.memberId = session.memberId;
    }
  }

  // Admin authentication
  const adminMatch = cookieHeader.match(/admin_token=([^;]+)/);
  const aToken = adminMatch ? decodeURIComponent(adminMatch[1]) : url.searchParams.get('admin_token');
  if (aToken) {
    const adminSession = verifyAdminToken(aToken);
    if (adminSession) {
      ws.isAdmin = true;
    }
  }

  // Coordinator authentication
  const coordMatch = cookieHeader.match(/coord_token=([^;]+)/);
  const cToken = coordMatch ? decodeURIComponent(coordMatch[1]) : url.searchParams.get('coord_token');
  if (cToken) {
    const coordSession = verifyCoordinatorToken(cToken);
    if (coordSession) {
      ws.isCoordinator = true;
      ws.coordinatorName = coordSession.coordinator;
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

  if (ws.isAdmin) {
    ws.send(
      JSON.stringify({
        type: 'admin:update',
        overview: gameEngine.getAdminOverview()
      })
    );
  }

  if (ws.isCoordinator && ws.coordinatorName) {
    ws.send(
      JSON.stringify({
        type: 'coord:update',
        teams: gameEngine.getCoordinatorTeams(ws.coordinatorName)
      })
    );
  }

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'auth' && data.token) {
        const session = gameEngine.verifyDeviceToken(data.token);
        if (session) {
          ws.teamId = session.teamId;
          ws.memberId = session.memberId;
          const state = gameEngine.getClientTeamState(session.teamId);
          if (state) {
            ws.send(JSON.stringify({ type: 'state:update', state }));
          }
        }
      }
    } catch (err) {}
  });

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

// Start server (only in standalone Node / LAN mode, not in Vercel serverless environment)
async function start() {
  await db.init();
  await gameEngine.loadFromDb();

  if (!process.env.VERCEL) {
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
}

if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  });
}

export { app, server, start };
export default app;


import http from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import os from 'os';
import { CONFIG } from './server/config/index.js';
import { db } from './server/db/database.js';
import { gameEngine } from './server/services/gameEngine.js';
import { verifyAdminToken, verifyCoordinatorToken } from './server/services/auth.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || CONFIG.PORT || 3000, 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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

async function startServer() {
  await db.init();
  await gameEngine.loadFromDb();
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

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

  server.listen(port, hostname, () => {
    const lanIp = getLanIp();
    console.log(`\n========================================================`);
    console.log(`🚀 FINAL OVERRIDE Next.js App Server Online`);
    console.log(`📡 Local:   http://localhost:${port}`);
    console.log(`🌐 LAN URL: http://${lanIp}:${port}`);
    console.log(`🔐 Admin PIN: ${CONFIG.ADMIN_PIN}`);
    console.log(`⚡ Hard Cap:  ${CONFIG.TIME_CAP_SECONDS} seconds (90 minutes)`);
    console.log(`========================================================\n`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE) {
  if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch((err) => {
      console.error('Fatal Server Startup Error:', err);
      process.exit(1);
    });
  }
}

export { startServer };
export default startServer;

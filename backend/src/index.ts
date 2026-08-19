import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { createAuthRouter } from './routes/auth.js';
import { createLobbyRouter } from './routes/lobby.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { loadAccounts } from './store/accounts.js';

import { logger } from './lib/logger.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// REST 路由
app.use('/api/auth', createAuthRouter());
app.use('/api/lobby', createLobbyRouter());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const server = http.createServer(app);

// WebSocket
const io = new SocketServer(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

registerSocketHandlers(io);

loadAccounts();

server.listen(PORT, () => {
  logger.info(`🎮 holdem-poker 后端已启动`);
  logger.info(`   REST:  http://localhost:${PORT}/api`);
  logger.info(`   WS:    ws://localhost:${PORT} (CORS: ${CLIENT_URL})`);
});

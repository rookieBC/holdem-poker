import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { createAuthRouter } from './routes/auth.js';
import { createLobbyRouter } from './routes/lobby.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { loadAccounts } from './store/accounts.js';

import { logger } from './lib/logger.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// 生产环境：前后端同源，CORS 允许自身；开发环境：前端 5173
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// 生产环境：托管前端静态文件（构建产物在 ../frontend/dist）
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback：所有非 /api 路由返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  logger.info(`   静态:  ${frontendDist}`);
}

const server = http.createServer(app);

// WebSocket
const io = new SocketServer(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

registerSocketHandlers(io);

loadAccounts();

server.listen(PORT, () => {
  logger.info(`🎮 holdem-poker 已启动`);
  logger.info(`   地址:  http://localhost:${PORT}`);
  logger.info(`   REST:  http://localhost:${PORT}/api`);
  logger.info(`   WS:    ws://localhost:${PORT}`);
});

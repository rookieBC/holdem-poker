import { Router } from 'express';
import { loginOrCreate, getAccountByToken } from '../store/accounts.js';
import { logger } from '../lib/logger.js';

export function createAuthRouter(): Router {
  const router = Router();

  // 一键登录/注册：POST /api/auth/login  body: { token? }
  router.post('/login', (req, res) => {
    const token = req.body?.token as string | undefined;
    const account = loginOrCreate(token);
    logger.info(`账户登录: ${account.username} (${account.id}) chips=${account.chips}`);
    res.json(account);
  });

  // 验证 token: GET /api/auth/me?token=xxx
  router.get('/me', (req, res) => {
    const token = (req.query.token as string) || '';
    const account = getAccountByToken(token);
    if (!account) {
      res.status(404).json({ error: '无效 token' });
      return;
    }
    res.json(account);
  });

  return router;
}

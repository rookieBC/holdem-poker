import { Router } from 'express';
import { listRooms, createRoom, defaultConfig } from '../store/rooms.js';

export function createLobbyRouter(): Router {
  const router = Router();

  // 房间列表 GET /api/lobby/rooms
  router.get('/rooms', (_req, res) => {
    const rooms = listRooms().map((r) => ({
      id: r.id,
      name: r.name,
      seatedCount: r.seats.filter((s) => s.player !== null).length,
      maxSeats: r.config.maxSeats,
      hasGame: r.gameState !== null,
    }));
    res.json(rooms);
  });

  // 创建房间 POST /api/lobby/rooms  body: { name? }
  router.post('/rooms', (req, res) => {
    const name = (req.body?.name as string) || '新房间';
    const room = createRoom(name, defaultConfig());
    res.json({ id: room.id, name: room.name });
  });

  return router;
}

import type { Server, Socket } from 'socket.io';
import { ClientEvent, ServerEvent } from '@holdem/shared';
import type { Account, PlayerAction, Room } from '@holdem/shared';
import { loginOrCreate, getAccountById, updateAccount, recordGameResult } from '../store/accounts.js';
import { getRoom, listRooms, createRoom, defaultConfig, deleteRoom } from '../store/rooms.js';
import { startGame, processAction, endHand } from '../game/gameManager.js';
import { filterRoomForPlayer, filterStateForPlayer, toLobbyRoomInfo } from '../game/broadcast.js';
import { logger } from '../lib/logger.js';

const socketRoomMap = new Map<string, string>();

function getAccount(socket: Socket): Account | null {
  return (socket.data.account as Account) ?? null;
}

function broadcastGameState(io: Server, room: Room | undefined, roomId: string): void {
  if (!room || !room.gameState) return;
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const acc = getAccount(s);
    if (!acc) continue;
    const filtered = filterStateForPlayer(room.gameState, acc.id);
    s.emit(ServerEvent.GameState, filtered);
  }
}

function broadcastRoomState(io: Server, room: Room | undefined, roomId: string): void {
  if (!room) return;
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    const acc = getAccount(s);
    if (!acc) continue;
    const filtered = filterRoomForPlayer(room, acc.id);
    s.emit(ServerEvent.RoomState, filtered);
  }
}

function syncAccountsAfterSettle(room: Room): void {
  if (!room.gameState) return;
  for (const seat of room.gameState.seats) {
    if (!seat.player) continue;
    const acc = getAccountById(seat.player.id);
    if (!acc) continue;
    const delta = seat.player.chips - acc.chips;
    const won = delta > 0;
    acc.chips = seat.player.chips;
    recordGameResult(acc, won, Math.max(0, delta), undefined);
    updateAccount(acc);
  }
}

/** 检查房间是否应销毁：无人在socket房间且无座位玩家 */
function shouldDestroyRoom(io: Server, roomId: string): boolean {
  const room = getRoom(roomId);
  if (!room) return true;
  if (room.gameState) return false;
  const hasSeatedPlayer = room.seats.some((s) => s.player !== null);
  if (hasSeatedPlayer) return false;
  const sockets = io.sockets.adapter.rooms.get(roomId);
  const hasConnection = sockets && sockets.size > 0;
  return !hasConnection;
}

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket 连接: ${socket.id}`);

    // 账户
    socket.on(ClientEvent.AuthLogin, (payload: { token?: string }, ack) => {
      const account = loginOrCreate(payload?.token);
      socket.data.account = account;
      socket.join(`user:${account.id}`);
      ack?.(account);
      logger.info(`登录: ${account.username}`);
    });

    // 大厅
    socket.on(ClientEvent.LobbyList, (_payload, ack) => {
      const rooms = listRooms().map(toLobbyRoomInfo);
      ack?.(rooms);
    });

    socket.on(ClientEvent.RoomCreate, (payload: { name?: string }, ack) => {
      const acc = getAccount(socket);
      if (!acc) { ack?.({ error: '请先登录' }); return; }
      const name = payload?.name || `${acc.username} 的房间`;
      const room = createRoom(name, defaultConfig());
      room.hostPlayerId = acc.id;
      logger.info(`创建房间: ${room.name} (${room.id})`);
      ack?.({ id: room.id, name: room.name });
    });

    // 房间
    socket.on(ClientEvent.RoomJoin, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      if (!acc) { ack?.({ error: '请先登录' }); return; }
      const room = getRoom(payload.roomId);
      if (!room) { ack?.({ error: '房间不存在' }); return; }
      socket.join(room.id);
      socketRoomMap.set(socket.id, room.id);
      ack?.(filterRoomForPlayer(room, acc.id));
      broadcastRoomState(io, room, room.id);
      logger.info(`${acc.username} 进入房间 ${room.name}`);
    });

    socket.on(ClientEvent.RoomLeave, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (room && acc) {
        const seat = room.seats.find((s) => s.player?.id === acc.id);
        if (seat) seat.player = null;
      }
      socket.leave(payload.roomId);
      socketRoomMap.delete(socket.id);
      ack?.();
      // 无人则销毁房间
      if (room && shouldDestroyRoom(io, room.id)) {
        deleteRoom(room.id);
        logger.info('房间已销毁(无人): ' + room.name);
      } else if (room) {
        broadcastRoomState(io, room, payload.roomId);
      }
    });

    // 坐下
    socket.on(ClientEvent.SeatTake, (payload: { roomId: string; seatIndex: number }, ack) => {
      const acc = getAccount(socket);
      if (!acc) { ack?.({ error: '请先登录' }); return; }
      const room = getRoom(payload.roomId);
      if (!room) { ack?.({ error: '房间不存在' }); return; }
      if (room.gameState) { ack?.({ error: '游戏进行中' }); return; }
      if (payload.seatIndex < 0 || payload.seatIndex >= room.config.maxSeats) {
        ack?.({ error: '无效座位号' }); return;
      }
      if (room.seats[payload.seatIndex].player) { ack?.({ error: '该座位已有人' }); return; }

      const oldSeat = room.seats.find((s) => s.player?.id === acc.id);
      if (oldSeat) oldSeat.player = null;

      room.seats[payload.seatIndex].player = {
        id: acc.id, username: acc.username, avatar: 'default',
        chips: acc.chips, isReady: false, isSeated: true,
        inHand: false, hasFolded: false, isAllIn: false,
        betThisRound: 0, totalCommitted: 0, holeCards: null, lastAction: null,
      };
      ack?.({ ok: true });
      broadcastRoomState(io, room, room.id);
      logger.info(`${acc.username} 坐下 座位 ${payload.seatIndex}`);
    });

    // 站起
    socket.on(ClientEvent.SeatStand, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      if (room.gameState) { ack?.({ error: '游戏进行中' }); return; }
      const seat = room.seats.find((s) => s.player?.id === acc.id);
      if (seat) seat.player = null;
      ack?.({ ok: true });
      broadcastRoomState(io, room, room.id);
    });

    // 准备
    socket.on(ClientEvent.ReadyToggle, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      if (room.gameState) { ack?.({ error: '游戏进行中' }); return; }
      const seat = room.seats.find((s) => s.player?.id === acc.id);
      if (!seat || !seat.player) { ack?.({ error: '请先坐下' }); return; }
      // 筹码不足大盲注时不能准备
      if (seat.player.chips < room.config.bigBlind) {
        ack?.({ error: `筹码不足，至少需要 ${room.config.bigBlind} 筹码` }); return;
      }
      seat.player.isReady = !seat.player.isReady;
      ack?.({ ok: true, ready: seat.player.isReady });
      broadcastRoomState(io, room, room.id);
    });

    // 开局
    socket.on(ClientEvent.GameStart, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      if (room.hostPlayerId !== acc.id) { ack?.({ error: '仅房主可开局' }); return; }
      const result = startGame(room);
      if (!result.ok) { ack?.({ error: result.reason }); return; }
      ack?.({ ok: true });
      broadcastGameState(io, room, room.id);
      // 广播发底牌动画事件
      io.to(room.id).emit(ServerEvent.GameEvent, {
        type: 'deal-hole',
        data: {},
      });
      logger.info(`${acc.username} 发起开局`);
    });

    // 下注动作
    socket.on(ClientEvent.Action, (payload: { roomId: string; action: PlayerAction }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      // 记录动作前的阶段，用于判断是否发生阶段切换
      const prevStage = room.gameState?.stage;
      const result = processAction(room, acc.id, payload.action);
      if (!result.ok) { ack?.({ error: result.reason }); return; }
      ack?.({ ok: true });

      // 按动作类型广播动画事件（弃牌独立标识，其余归为 bet）
      if (room.gameState) {
        const eventType = payload.action.type === 'fold' ? 'fold' : 'bet';
        io.to(room.id).emit(ServerEvent.GameEvent, {
          type: eventType,
          data: { playerId: acc.id, action: payload.action },
        });
      }
      broadcastGameState(io, room, room.id);

      // 仅当阶段真正切换时才广播翻牌/摊牌/胜利动画事件
      if (result.newStage && result.newStage !== prevStage && room.gameState) {
        const stage = result.newStage;
        if (stage === 'flop' || stage === 'turn' || stage === 'river') {
          io.to(room.id).emit(ServerEvent.GameEvent, {
            type: 'deal-community',
            data: { stage, count: stage === 'flop' ? 3 : 1 },
          });
        } else if (stage === 'showdown') {
          io.to(room.id).emit(ServerEvent.GameEvent, {
            type: 'showdown',
            data: {},
          });
        } else if (stage === 'settled') {
          // 若 settled 前未经过独立 showdown 阶段（如仅剩一人），先补 showdown 再 win
          if (prevStage !== 'showdown') {
            io.to(room.id).emit(ServerEvent.GameEvent, {
              type: 'showdown',
              data: {},
            });
          }
          io.to(room.id).emit(ServerEvent.GameEvent, {
            type: 'win',
            data: { winners: room.gameState.winners ?? [] },
          });
        }
      }

      // 结算后只同步账户筹码，不自动清理（等待房主发起 game:next）
      if (result.newStage === 'settled' && room.gameState) {
        syncAccountsAfterSettle(room);
        // 广播更新后的筹码（仍保持 settled 状态，前端显示结算画面）
        broadcastGameState(io, room, room.id);
      }
    });

    // 下一局：房主发起，清理上局并回到座位准备阶段
    socket.on(ClientEvent.GameNext, (payload: { roomId: string }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      // 只有 settled 状态才能发起下一局
      if (!room.gameState || room.gameState.stage !== 'settled') {
        ack?.({ error: '当前无法开始下一局' }); return;
      }
      endHand(room, getAccountById);
      broadcastRoomState(io, room, room.id);
      logger.info(`${acc.username} 发起下一局`);
      ack?.({ ok: true });
    });

    // 断开
    socket.on('disconnect', () => {
      const acc = getAccount(socket);
      const roomId = socketRoomMap.get(socket.id);
      logger.info(`Socket 断开: ${socket.id}`);
      if (roomId && acc) {
        const room = getRoom(roomId);
        if (room) {
          const seat = room.seats.find((s) => s.player?.id === acc.id);
          if (seat && !room.gameState) seat.player = null;
          if (shouldDestroyRoom(io, room.id)) {
            deleteRoom(room.id);
            logger.info('房间已销毁(无人断开): ' + room.name);
          } else {
            broadcastRoomState(io, room, roomId);
          }
        }
      }
      socketRoomMap.delete(socket.id);
    });
  });
}

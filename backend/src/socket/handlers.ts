import type { Server, Socket } from 'socket.io';
import { ClientEvent, ServerEvent } from '@holdem/shared';
import type { Account, PlayerAction, Room } from '@holdem/shared';
import { loginOrCreate, getAccountById, updateAccount, recordGameResult } from '../store/accounts.js';
import { getRoom, listRooms, createRoom, defaultConfig } from '../store/rooms.js';
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
      if (room) broadcastRoomState(io, room, payload.roomId);
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
      logger.info(`${acc.username} 发起开局`);
    });

    // 下注动作
    socket.on(ClientEvent.Action, (payload: { roomId: string; action: PlayerAction }, ack) => {
      const acc = getAccount(socket);
      const room = getRoom(payload.roomId);
      if (!room || !acc) { ack?.({ error: '无效请求' }); return; }
      const result = processAction(room, acc.id, payload.action);
      if (!result.ok) { ack?.({ error: result.reason }); return; }
      ack?.({ ok: true });

      if (room.gameState) {
        io.to(room.id).emit(ServerEvent.GameEvent, {
          type: 'bet',
          data: { playerId: acc.id, action: payload.action },
        });
      }
      broadcastGameState(io, room, room.id);

      if (result.newStage === 'settled' && room.gameState) {
        syncAccountsAfterSettle(room);
        setTimeout(() => {
          endHand(room);
          broadcastRoomState(io, room, room.id);
        }, 4000);
      }
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
          broadcastRoomState(io, room, roomId);
        }
      }
      socketRoomMap.delete(socket.id);
    });
  });
}

import { io, type Socket } from 'socket.io-client';
import {
  ClientEvent,
  ServerEvent,
  type Account,
  type Room,
  type GameState,
  type PlayerAction,
  type RoomConfig,
} from '@holdem/shared';

// 大厅房间简化信息
export interface LobbyRoomInfo {
  id: string;
  name: string;
  seatedCount: number;
  maxSeats: number;
  hasGame: boolean;
}

// ack 响应统一类型
type Ack<T> = (res: T) => void;

let socket: Socket | null = null;

/** 获取（并按需创建）全局 socket 单例 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

/** 连接 socket（幂等） */
export function connect(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** 断开 socket */
export function disconnect(): void {
  if (socket) socket.disconnect();
}

// ============================================================
// 请求/响应封装（基于 ack）
// ============================================================

export const api = {
  /** 一键登录/注册 */
  authLogin: (token?: string) =>
    emitAck<Account | { error: string }>(ClientEvent.AuthLogin, { token }),

  /** 拉取大厅房间列表 */
  lobbyList: () => emitAck<LobbyRoomInfo[]>(ClientEvent.LobbyList),

  /** 创建房间 */
  roomCreate: (name?: string) =>
    emitAck<{ id: string; name: string } | { error: string }>(ClientEvent.RoomCreate, { name }),

  /** 加入房间 */
  roomJoin: (roomId: string) =>
    emitAck<Room | { error: string }>(ClientEvent.RoomJoin, { roomId }),

  /** 离开房间 */
  roomLeave: (roomId: string) => emitAck<void>(ClientEvent.RoomLeave, { roomId }),

  /** 坐下 */
  seatTake: (roomId: string, seatIndex: number) =>
    emitAck<{ ok: boolean } | { error: string }>(ClientEvent.SeatTake, { roomId, seatIndex }),

  /** 站起 */
  seatStand: (roomId: string) =>
    emitAck<{ ok: boolean } | { error: string }>(ClientEvent.SeatStand, { roomId }),

  /** 切换准备 */
  readyToggle: (roomId: string) =>
    emitAck<{ ok: boolean; ready: boolean } | { error: string }>(ClientEvent.ReadyToggle, { roomId }),

  /** 房主开局 */
  gameStart: (roomId: string) =>
    emitAck<{ ok: boolean } | { error: string }>(ClientEvent.GameStart, { roomId }),

  /** 下注动作 */
  action: (roomId: string, action: PlayerAction) =>
    emitAck<{ ok: boolean } | { error: string }>(ClientEvent.Action, { roomId, action }),
};

function emitAck<T>(event: ClientEvent, payload: unknown = undefined): Promise<T> {
  const s = connect();
  return new Promise((resolve) => {
    s.emit(event, payload, (res: T) => resolve(res));
  });
}

// ============================================================
// 服务端推送订阅
// ============================================================

export const subscriptions = {
  /** 房间完整状态变更（含座位变化） */
  onRoomState: (cb: (room: Room) => void) =>
    on(ServerEvent.RoomState, cb),

  /** 游戏局面更新 */
  onGameState: (cb: (state: GameState) => void) =>
    on(ServerEvent.GameState, cb),

  /** 动画事件（发牌/下注/胜负） */
  onGameEvent: (cb: (payload: { type: string; data: Record<string, unknown> }) => void) =>
    on(ServerEvent.GameEvent, cb),

  /** 错误 */
  onError: (cb: (msg: string) => void) => on(ServerEvent.Error, cb),

  /** 大厅列表推送 */
  onLobbyList: (cb: (rooms: LobbyRoomInfo[]) => void) =>
    on(ServerEvent.LobbyList, cb),
};

function on<T>(event: ServerEvent, cb: (payload: T) => void): () => void {
  const s = getSocket();
  s.on(event, cb as (payload: unknown) => void);
  return () => s.off(event, cb as (payload: unknown) => void);
}

// 避免未使用导入告警（类型在此模块内可用）
export type { RoomConfig };

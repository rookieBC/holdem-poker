import { create } from 'zustand';
import type { Room, PlayerAction } from '@holdem/shared';
import type { LobbyRoomInfo } from '../lib/socket';
import { api, subscriptions } from '../lib/socket';

// error 自动过期定时器
let errorTimer: ReturnType<typeof setTimeout> | null = null;

/** 设置 error 并在指定毫秒后自动清除 */
function setErrorWithExpiry(set: (partial: Partial<RoomStore>) => void, msg: string, ms = 3000) {
  if (errorTimer) clearTimeout(errorTimer);
  set({ error: msg });
  errorTimer = setTimeout(() => {
    set({ error: null });
    errorTimer = null;
  }, ms);
}

/** 清除 error 并取消定时器 */
function clearError(set: (partial: Partial<RoomStore>) => void) {
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }
  set({ error: null });
}

interface RoomStore {
  /** 大厅房间列表 */
  lobbyRooms: LobbyRoomInfo[];
  /** 当前所在房间（含已过滤状态） */
  currentRoom: Room | null;
  /** 加载态 */
  loading: boolean;
  /** 通用错误（大厅/房间操作） */
  error: string | null;
  /** 下注操作专用错误（操作面板用） */
  lastError: string | null;
  /** 是否已订阅服务端推送 */
  _subscribed: boolean;

  refreshLobby: () => Promise<void>;
  createRoom: (name?: string) => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  takeSeat: (seatIndex: number) => Promise<boolean>;
  standUp: () => Promise<void>;
  toggleReady: () => Promise<boolean>;
  startGame: () => Promise<boolean>;
  /** 发送下注动作 */
  takeAction: (action: PlayerAction) => Promise<boolean>;
  setRoom: (room: Room | null) => void;
  clearError: () => void;
  /** 订阅服务端房间/游戏状态推送（幂等） */
  subscribe: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  lobbyRooms: [],
  currentRoom: null,
  loading: false,
  error: null,
  lastError: null,
  _subscribed: false,

  refreshLobby: async () => {
    try {
      const rooms = await api.lobbyList();
      set({ lobbyRooms: rooms ?? [] });
    } catch {
      setErrorWithExpiry(set, '拉取房间列表失败');
    }
  },

  createRoom: async (name) => {
    clearError(set);
    set({ loading: true });
    const res = await api.roomCreate(name);
    set({ loading: false });
    if (res && 'error' in res) {
      setErrorWithExpiry(set, res.error);
      return null;
    }
    return (res as { id: string }).id;
  },

  joinRoom: async (roomId) => {
    clearError(set);
    set({ loading: true });
    const res = await api.roomJoin(roomId);
    set({ loading: false });
    if (res && 'error' in res) {
      setErrorWithExpiry(set, res.error);
      return false;
    }
    set({ currentRoom: res as Room });
    return true;
  },

  leaveRoom: async () => {
    const room = get().currentRoom;
    if (room) await api.roomLeave(room.id);
    set({ currentRoom: null });
  },

  takeSeat: async (seatIndex) => {
    clearError(set);
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.seatTake(room.id, seatIndex);
    if (res && 'error' in res) {
      setErrorWithExpiry(set, res.error);
      return false;
    }
    return true;
  },

  standUp: async () => {
    clearError(set);
    const room = get().currentRoom;
    if (!room) return;
    await api.seatStand(room.id);
  },

  toggleReady: async () => {
    clearError(set);
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.readyToggle(room.id);
    if (res && 'error' in res) {
      setErrorWithExpiry(set, res.error);
      return false;
    }
    return true;
  },

  startGame: async () => {
    clearError(set);
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.gameStart(room.id);
    if (res && 'error' in res) {
      setErrorWithExpiry(set, res.error);
      return false;
    }
    return true;
  },

  takeAction: async (action) => {
    const room = get().currentRoom;
    if (!room) return false;
    // 清除上一次操作错误
    set({ lastError: null });
    const res = await api.action(room.id, action);
    if (res && 'error' in res) {
      // 操作错误用 lastError，自动 3 秒过期
      set({ lastError: res.error });
      setTimeout(() => {
        if (get().lastError === res.error) set({ lastError: null });
      }, 3000);
      return false;
    }
    return true;
  },

  setRoom: (currentRoom) => set({ currentRoom }),

  clearError: () => clearError(set),

  subscribe: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });
    subscriptions.onRoomState((room) => {
      clearError(set);
      set({ currentRoom: room });
    });
  },
}));

import { create } from 'zustand';
import type { Room } from '@holdem/shared';
import type { LobbyRoomInfo } from '../lib/socket';
import { api, subscriptions } from '../lib/socket';

interface RoomStore {
  /** 大厅房间列表 */
  lobbyRooms: LobbyRoomInfo[];
  /** 当前所在房间（含已过滤状态） */
  currentRoom: Room | null;
  /** 加载态 */
  loading: boolean;
  error: string | null;
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
  setRoom: (room: Room | null) => void;
  /** 订阅服务端房间/游戏状态推送（幂等） */
  subscribe: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  lobbyRooms: [],
  currentRoom: null,
  loading: false,
  error: null,
  _subscribed: false,

  refreshLobby: async () => {
    try {
      const rooms = await api.lobbyList();
      set({ lobbyRooms: rooms ?? [] });
    } catch {
      set({ error: '拉取房间列表失败' });
    }
  },

  createRoom: async (name) => {
    set({ loading: true, error: null });
    const res = await api.roomCreate(name);
    set({ loading: false });
    if (res && 'error' in res) {
      set({ error: res.error });
      return null;
    }
    return (res as { id: string }).id;
  },

  joinRoom: async (roomId) => {
    set({ loading: true, error: null });
    const res = await api.roomJoin(roomId);
    set({ loading: false });
    if (res && 'error' in res) {
      set({ error: res.error });
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
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.seatTake(room.id, seatIndex);
    if (res && 'error' in res) {
      set({ error: res.error });
      return false;
    }
    return true;
  },

  standUp: async () => {
    const room = get().currentRoom;
    if (!room) return;
    await api.seatStand(room.id);
  },

  toggleReady: async () => {
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.readyToggle(room.id);
    if (res && 'error' in res) {
      set({ error: res.error });
      return false;
    }
    return true;
  },

  startGame: async () => {
    const room = get().currentRoom;
    if (!room) return false;
    const res = await api.gameStart(room.id);
    if (res && 'error' in res) {
      set({ error: res.error });
      return false;
    }
    return true;
  },

  setRoom: (currentRoom) => set({ currentRoom }),

  subscribe: () => {
    if (get()._subscribed) return;
    set({ _subscribed: true });
    subscriptions.onRoomState((room) => set({ currentRoom: room }));
  },
}));

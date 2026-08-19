import { create } from 'zustand';
import type { GameState } from '@holdem/shared';
import { subscriptions } from '../lib/socket';

interface GameStore {
  state: GameState | null;
  /** 最近一条动画事件 */
  lastEvent: { type: string; data: Record<string, unknown> } | null;
  subscribed: boolean;
  subscribe: () => void;
  setState: (s: GameState | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  lastEvent: null,
  subscribed: false,

  subscribe: () => {
    if (get().subscribed) return;
    set({ subscribed: true });
    subscriptions.onGameState((s) => set({ state: s }));
    subscriptions.onGameEvent((e) => set({ lastEvent: e }));
    // 当房间状态推送且不含 gameState（局已结束），清除游戏状态
    subscriptions.onRoomState((room) => {
      if (!room.gameState) set({ state: null });
    });
  },

  setState: (state) => set({ state }),
}));

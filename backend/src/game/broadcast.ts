import type { Room, GameState, Seat, PublicPlayer, Card } from '@holdem/shared';
import { GameStage } from '@holdem/shared';
import { deepClone } from '@holdem/shared';

/**
 * 为指定玩家生成其可观测的游戏状态（遮蔽他人底牌）
 * - 自己的底牌可见
 * - 他人底牌在 showdown 阶段才可见，否则为 null
 * - 牌堆始终不广播
 */
export function filterStateForPlayer(state: GameState, playerId: string): GameState {
  const filtered = deepClone(state);
  // 牌堆不广播
  filtered.deck = [];

  for (const seat of filtered.seats) {
    if (!seat.player) continue;
    const p = seat.player;
    if (p.id === playerId) {
      // 自己的底牌可见
      continue;
    }
    // 他人底牌：仅 showdown 后揭示
    if (filtered.stage !== GameStage.Showdown && filtered.stage !== GameStage.Settled) {
      p.holeCards = null;
    }
    // hasFolded 玩家的底牌始终不可见
    if (p.hasFolded) {
      p.holeCards = null;
    }
  }
  return filtered;
}

/** 生成房间的公开状态（不含游戏内部状态如牌堆） */
export function filterRoomForPlayer(room: Room, playerId: string): Room {
  const filtered = deepClone(room);
  if (filtered.gameState) {
    filtered.gameState = filterStateForPlayer(filtered.gameState, playerId);
  }
  return filtered;
}

/** 生成大厅用的简化房间信息（不含游戏细节） */
export function toLobbyRoomInfo(room: Room) {
  return {
    id: room.id,
    name: room.name,
    seatedCount: room.seats.filter((s) => s.player !== null).length,
    maxSeats: room.config.maxSeats,
    hasGame: room.gameState !== null,
    hostId: room.hostPlayerId,
  };
}

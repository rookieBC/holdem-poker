import type { Room, GameState, Seat, PlayerAction } from '@holdem/shared';
import { GameStage } from '@holdem/shared';
import {
  createGameState,
  dealHoleCards,
  advanceStage,
  settleShowdown,
  isOnlyOneLeft,
  isRoundComplete,
  nextPlayerIndex,
} from '@holdem/shared';
import { validateAction, applyAction } from '@holdem/shared';
import { logger } from '../lib/logger.js';

const roundActedPlayers = new Map<string, Set<string>>();

function getActedSet(roomId: string): Set<string> {
  if (!roundActedPlayers.has(roomId)) roundActedPlayers.set(roomId, new Set());
  return roundActedPlayers.get(roomId)!;
}

function computePot(state: GameState): number {
  return state.seats.reduce((sum, s) => sum + (s.player?.totalCommitted ?? 0), 0);
}

function nextSeatedIndex(seats: Seat[], fromIndex: number): number {
  const len = seats.length;
  for (let step = 1; step <= len; step++) {
    const idx = (fromIndex + step) % len;
    if (seats[idx].player !== null && seats[idx].player!.isSeated) return idx;
  }
  return 0;
}

/** 开局：创建游戏状态并发底牌 */
export function startGame(room: Room): { ok: boolean; reason?: string } {
  if (room.gameState) return { ok: false, reason: '游戏进行中' };
  const seatedPlayers = room.seats.filter((s) => s.player !== null && s.player.isSeated);
  if (seatedPlayers.length < room.config.minPlayers) {
    return { ok: false, reason: `至少需要 ${room.config.minPlayers} 人` };
  }
  const readyCount = seatedPlayers.filter((s) => s.player!.isReady).length;
  if (readyCount < room.config.minPlayers) {
    return { ok: false, reason: '还有玩家未准备' };
  }

  const prevDealer = (room as Room & { _lastDealer?: number })._lastDealer ?? -1;
  const dealerIndex = nextSeatedIndex(room.seats, prevDealer);

  const state = createGameState(room.seats, room.config, dealerIndex);
  room.gameState = dealHoleCards(state);
  getActedSet(room.id).clear();

  logger.info(`房间 ${room.name} 开局: 庄家座 ${dealerIndex}`);
  return { ok: true };
}

/** 处理玩家下注动作 */
export function processAction(
  room: Room,
  playerId: string,
  action: PlayerAction,
): { ok: boolean; reason?: string; newStage?: GameStage } {
  if (!room.gameState) return { ok: false, reason: '未在游戏中' };
  let state = room.gameState;

  const seatIdx = state.currentPlayerIndex;
  const seat = state.seats[seatIdx];
  if (!seat.player || seat.player.id !== playerId) {
    return { ok: false, reason: '不是你的回合' };
  }

  const player = seat.player;
  const result = validateAction(player, action.type, state.currentBet, state.minRaise, action.amount);
  if (!result.ok) return { ok: false, reason: result.reason };

  applyAction(player, action.type, state.currentBet, action.amount);

  // raise 更新 currentBet / minRaise
  if (action.type === 'raise' && action.amount) {
    const raiseDelta = action.amount - state.currentBet;
    state.currentBet = action.amount;
    if (raiseDelta > state.minRaise) state.minRaise = raiseDelta;
    // raise 后其他玩家需重新行动
    const acted = getActedSet(room.id);
    for (const p of state.seats) {
      if (p.player && p.player.id !== playerId) acted.delete(p.player.id);
    }
  }

  // all-in 如果超过当前下注，也需更新 currentBet（视为加注）
  if (action.type === 'all-in') {
    const allInBet = player.betThisRound;
    if (allInBet > state.currentBet) {
      const raiseDelta = allInBet - state.currentBet;
      state.currentBet = allInBet;
      if (raiseDelta >= state.minRaise) state.minRaise = raiseDelta;
      // all-in 视为加注，其他玩家需重新行动
      const acted = getActedSet(room.id);
      for (const p of state.seats) {
        if (p.player && p.player.id !== playerId) acted.delete(p.player.id);
      }
    }
  }

  state.currentPot = computePot(state);
  getActedSet(room.id).add(playerId);

  // 仅剩一人（其余弃牌）
  if (isOnlyOneLeft(state)) {
    const settled = settleShowdown(state);
    room.gameState = settled.state;
    logger.info(`房间 ${room.name} 仅剩一人，结算完成`);
    return { ok: true, newStage: GameStage.Settled };
  }

  // 本轮完成则推进
  const acted = getActedSet(room.id);
  if (isRoundComplete(state, acted)) {
    const canAct = state.seats.filter(
      (s) => s.player && s.player.inHand && !s.player.isAllIn && !s.player.hasFolded,
    );
    if (canAct.length <= 1 && state.stage !== GameStage.River) {
      // 都 all-in 则直接发完牌摊牌
      let s = state;
      while (s.stage !== GameStage.River) s = advanceStage(s);
      const settled = settleShowdown(s);
      room.gameState = settled.state;
      return { ok: true, newStage: GameStage.Settled };
    }

    state = advanceStage(state);
    room.gameState = state;
    getActedSet(room.id).clear();
    logger.info(`房间 ${room.name} 推进到 ${state.stage}`);

    // 推进到 Showdown 时立即摊牌结算
    if (state.stage === GameStage.Showdown) {
      const settled = settleShowdown(state);
      room.gameState = settled.state;
      return { ok: true, newStage: GameStage.Settled };
    }
    return { ok: true, newStage: state.stage };
  }

  state.currentPlayerIndex = nextPlayerIndex(state);
  return { ok: true, newStage: state.stage };
}

/** 清理一局，准备下一局 */
export function endHand(room: Room): void {
  if (!room.gameState) return;
  (room as Room & { _lastDealer?: number })._lastDealer = room.gameState.dealerIndex;
  room.gameState = null;
  getActedSet(room.id).clear();
  for (const seat of room.seats) {
    if (seat.player) {
      seat.player.isReady = false;
      seat.player.lastAction = null;
    }
  }
}
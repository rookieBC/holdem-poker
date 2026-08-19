import type { Card, GameState, PublicPlayer, Seat, Pot, RoomConfig } from '../types';
import { GameStage } from '../types';
import { deepClone } from './clone.js';
import { createDeck, shuffle, draw } from './cards.js';
import { evaluateHand, compareHands, findWinners } from './handEvaluator.js';
import { calculatePots, distributePots } from './pot.js';

// ============================================================
// 创建/初始化游戏状态
// ============================================================

/** 从房间配置和座位创建一局新游戏状态（未发牌） */
export function createGameState(seats: Seat[], config: RoomConfig, dealerIndex: number): GameState {
  const activeSeats = seats
    .map((s, i) => ({ seat: s, i }))
    .filter((x) => x.seat.player !== null && x.seat.player.isSeated && x.seat.player.isReady);

  // 重置玩家本局状态
  for (const { seat } of activeSeats) {
    const p = seat.player!;
    p.inHand = true;
    p.hasFolded = false;
    p.isAllIn = false;
    p.betThisRound = 0;
    p.totalCommitted = 0;
    p.holeCards = null;
    p.lastAction = null;
  }

  return {
    stage: GameStage.PreFlop,
    deck: shuffle(createDeck()),
    communityCards: [],
    pots: [],
    currentPot: 0,
    seats,
    dealerIndex,
    smallBlindIndex: 0,
    bigBlindIndex: 0,
    currentPlayerIndex: 0,
    currentBet: 0,
    minRaise: config.bigBlind,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    handNumber: 1,
    actionDeadline: null,
  };
}

/** 获取仍在牌局中的玩家（按座位顺序） */
export function activePlayers(state: GameState): PublicPlayer[] {
  return state.seats
    .filter((s) => s.player !== null && s.player.inHand)
    .map((s) => s.player!);
}

/** 获取参与本局的所有座位索引（含已弃牌，用于结算） */
export function participants(state: GameState): number[] {
  return state.seats
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s.player !== null && x.s.player.totalCommitted > 0)
    .map((x) => x.i);
}

// ============================================================
// 发牌阶段：收盲注 + 发底牌
// ============================================================

/**
 * 收取盲注并发底牌，返回更新后的状态
 * @param state 初始游戏状态
 * @returns 更新后的状态（preflop，已发底牌）
 */
export function dealHoleCards(state: GameState): GameState {
  const s = deepClone(state);
  const playerSeats = s.seats
    .map((seat, i) => ({ seat, i }))
    .filter((x) => x.seat.player !== null && x.seat.player.inHand);

  const n = playerSeats.length;
  if (n < 2) return s;

  // 确定盲注位置：庄家左侧第一位=小盲，第二位=大盲（按座位顺序循环）
  const dealerIdx = s.dealerIndex;
  const sbIdx = nextActiveSeatIndex(s.seats, dealerIdx);
  const bbIdx = nextActiveSeatIndex(s.seats, sbIdx);
  s.smallBlindIndex = sbIdx;
  s.bigBlindIndex = bbIdx;

  // 收盲注
  const sbPlayer = s.seats[sbIdx].player!;
  const sbAmount = Math.min(s.smallBlind, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.betThisRound = sbAmount;
  sbPlayer.totalCommitted = sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

  const bbPlayer = s.seats[bbIdx].player!;
  const bbAmount = Math.min(s.bigBlind, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.betThisRound = bbAmount;
  bbPlayer.totalCommitted = bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

  s.currentBet = s.bigBlind;
  s.minRaise = s.bigBlind;
  s.currentPot = sbAmount + bbAmount;

  // 发底牌：每人2张，按顺序
  let deck = s.deck;
  for (const { seat } of playerSeats) {
    const { drawn, rest } = draw(deck, 2);
    seat.player!.holeCards = drawn;
    deck = rest;
  }
  s.deck = deck;

  // 第一个行动者：大盲左侧（heads-up 时小盲先行动）
  if (n === 2) {
    s.currentPlayerIndex = sbIdx; // heads-up: 庄家=小盲，翻牌前小盲先动
  } else {
    s.currentPlayerIndex = nextActiveSeatIndex(s.seats, bbIdx);
  }

  s.stage = GameStage.PreFlop;
  return s;
}

/** 找下一个有玩家的座位索引 */
function nextActiveSeatIndex(seats: Seat[], fromIndex: number): number {
  const len = seats.length;
  for (let step = 1; step <= len; step++) {
    const idx = (fromIndex + step) % len;
    const seat = seats[idx];
    if (seat.player !== null && seat.player.inHand && !seat.player.isAllIn) {
      return idx;
    }
  }
  return fromIndex;
}

// ============================================================
// 推进阶段：翻牌/转牌/河牌
// ============================================================

/** 发公共牌（flop 3张 / turn 1张 / river 1张） */
export function dealCommunityCards(state: GameState, count: number): GameState {
  const s = deepClone(state);
  // 烧牌1张（德州规则）
  let deck = s.deck;
  const { rest: afterBurn } = draw(deck, 1);
  deck = afterBurn;
  const { drawn, rest } = draw(deck, count);
  s.communityCards = [...s.communityCards, ...drawn];
  s.deck = rest;
  return s;
}

/**
 * 检查本轮下注是否结束（所有未弃牌玩家的 betThisRound 相等，且都已行动）
 * @param actedSet 已行动玩家id集合
 */
export function isRoundComplete(state: GameState, actedSet: Set<string>): boolean {
  const inHandNotAllIn = state.seats.filter(
    (s) => s.player !== null && s.player.inHand && !s.player.isAllIn,
  );
  if (inHandNotAllIn.length === 0) return true;

  const bets = inHandNotAllIn.map((s) => s.player!.betThisRound);
  const allMatch = bets.every((b) => b === state.currentBet);
  const allActed = inHandNotAllIn.every((s) => actedSet.has(s.player!.id));
  return allMatch && allActed;
}

/**
 * 推进到下一阶段，重置本轮下注
 */
export function advanceStage(state: GameState): GameState {
  const s = deepClone(state);
  // 重置本轮下注
  for (const seat of s.seats) {
    if (seat.player) {
      seat.player.betThisRound = 0;
      seat.player.lastAction = null;
    }
  }
  s.currentBet = 0;
  s.minRaise = s.bigBlind;

  switch (s.stage) {
    case GameStage.PreFlop:
      s.stage = GameStage.Flop;
      Object.assign(s, dealCommunityCards(s, 3));
      break;
    case GameStage.Flop:
      s.stage = GameStage.Turn;
      Object.assign(s, dealCommunityCards(s, 1));
      break;
    case GameStage.Turn:
      s.stage = GameStage.River;
      Object.assign(s, dealCommunityCards(s, 1));
      break;
    case GameStage.River:
      s.stage = GameStage.Showdown;
      break;
    default:
      break;
  }

  // 翻牌后第一个行动者：庄家左侧第一个未弃牌未全押玩家
  if (s.stage !== GameStage.Showdown) {
    s.currentPlayerIndex = nextActiveSeatIndexForAction(s.seats, s.dealerIndex);
  }

  return s;
}

/** 翻牌后找第一个可行动玩家（从 dealer 左侧开始，跳过弃牌/全押） */
function nextActiveSeatIndexForAction(seats: Seat[], fromIndex: number): number {
  const len = seats.length;
  for (let step = 1; step <= len; step++) {
    const idx = (fromIndex + step) % len;
    const seat = seats[idx];
    if (seat.player !== null && seat.player.inHand && !seat.player.isAllIn && !seat.player.hasFolded) {
      return idx;
    }
  }
  return fromIndex;
}

// ============================================================
// 摊牌与结算
// ============================================================

/** 仅剩一人时直接判胜（其余弃牌） */
export function isOnlyOneLeft(state: GameState): boolean {
  return activePlayers(state).length <= 1;
}

/**
 * 摊牌结算：评估所有未弃牌玩家的牌力，按底池分配
 * @returns playerId -> 赢得筹码
 */
export function settleShowdown(state: GameState): { state: GameState; winnings: Map<string, number> } {
  const s = deepClone(state);

  // 计算底池（边池）
  const allPlayers = s.seats
    .filter((seat) => seat.player !== null)
    .map((seat) => seat.player!);
  s.pots = calculatePots(allPlayers);

  const winnings = new Map<string, number>();

  if (isOnlyOneLeft(s)) {
    // 仅剩一人，独得全部底池
    const winner = activePlayers(s)[0];
    if (winner) {
      const total = allPlayers.reduce((sum, p) => sum + p.totalCommitted, 0);
      winnings.set(winner.id, total);
      winner.chips += total;
    }
    s.stage = GameStage.Settled;
    return { state: s, winnings };
  }

  // 评估每个未弃牌玩家的牌
  const evalsByPlayerId = new Map<string, { eval: ReturnType<typeof evaluateHand>; playerId: string }>();
  for (const p of allPlayers) {
    if (!p.hasFolded && p.holeCards) {
      const cards = [...p.holeCards, ...s.communityCards];
      evalsByPlayerId.set(p.id, { eval: evaluateHand(cards), playerId: p.id });
    }
  }

  // 按底池分配
  s.pots.forEach((pot) => {
    if (pot.amount === 0) return;
    // 找该底池有资格的玩家中牌力最强的
    const eligibleEvals = pot.eligiblePlayerIds
      .map((id) => evalsByPlayerId.get(id))
      .filter((e): e is { eval: ReturnType<typeof evaluateHand>; playerId: string } => e !== undefined);
    if (eligibleEvals.length === 0) return;

    const winnerIds = findWinners(eligibleEvals.map((e) => e.eval)).map(
      (idx) => eligibleEvals[idx].playerId,
    );

    // 分配该底池
    const share = Math.floor(pot.amount / winnerIds.length);
    let remainder = pot.amount - share * winnerIds.length;
    for (const wId of winnerIds) {
      let give = share;
      if (remainder > 0) {
        give += 1;
        remainder -= 1;
      }
      winnings.set(wId, (winnings.get(wId) ?? 0) + give);
      const winnerPlayer = allPlayers.find((p) => p.id === wId);
      if (winnerPlayer) winnerPlayer.chips += give;
    }
  });

  s.stage = GameStage.Settled;
  s.currentPot = 0;
  return { state: s, winnings };
}

/** 下一个行动玩家索引 */
export function nextPlayerIndex(state: GameState): number {
  return nextActiveSeatIndexForAction(state.seats, state.currentPlayerIndex);
}




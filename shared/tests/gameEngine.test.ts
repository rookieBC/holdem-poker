import { describe, it, expect } from 'vitest';
import {
  createGameState,
  dealHoleCards,
  advanceStage,
  settleShowdown,
  isOnlyOneLeft,
  isRoundComplete,
  nextPlayerIndex,
} from '../src/engine/gameEngine';
import type { Seat, RoomConfig, PublicPlayer } from '../src/types';
import { GameStage } from '../src/types';

function makePlayer(id: string, chips = 1000): PublicPlayer {
  return {
    id, username: id, avatar: 'x', chips,
    isReady: true, isSeated: true, inHand: true, hasFolded: false, isAllIn: false,
    betThisRound: 0, totalCommitted: 0, holeCards: null, lastAction: null,
  };
}

function makeSeats(playerIds: string[]): Seat[] {
  return playerIds.map((id, i) => ({ index: i, player: makePlayer(id) }));
}

const config: RoomConfig = {
  maxSeats: 6, minPlayers: 2, smallBlind: 10, bigBlind: 20, startingChips: 1000,
};

describe('createGameState', () => {
  it('创建初始状态为 PreFlop', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    expect(state.stage).toBe(GameStage.PreFlop);
    expect(state.communityCards).toHaveLength(0);
    expect(state.deck).toHaveLength(52);
  });
});

describe('dealHoleCards', () => {
  it('发2张底牌给每个玩家', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    expect(dealt.deck.length).toBe(52 - 6); // 3人各2张
    for (const seat of dealt.seats) {
      if (seat.player) expect(seat.player.holeCards).toHaveLength(2);
    }
  });

  it('收取盲注', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // dealer=0, sb=1, bb=2
    expect(dealt.smallBlindIndex).toBe(1);
    expect(dealt.bigBlindIndex).toBe(2);
    const sb = dealt.seats[1].player!;
    const bb = dealt.seats[2].player!;
    expect(sb.betThisRound).toBe(10);
    expect(bb.betThisRound).toBe(20);
    expect(dealt.currentBet).toBe(20);
  });

  it('heads-up 时小盲先行动', () => {
    const seats = makeSeats(['A','B']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // 2人：dealer=0也是sb, bb=1
    expect(dealt.currentPlayerIndex).toBe(dealt.smallBlindIndex);
  });
});

describe('advanceStage', () => {
  it('preflop → flop 发3张公共牌', () => {
    const seats = makeSeats(['A','B','C']);
    let state = createGameState(seats, config, 0);
    state = dealHoleCards(state);
    state = advanceStage(state);
    expect(state.stage).toBe(GameStage.Flop);
    expect(state.communityCards).toHaveLength(3);
    // 重置本轮下注
    expect(state.currentBet).toBe(0);
  });

  it('flop → turn 发1张', () => {
    const seats = makeSeats(['A','B','C']);
    let state = createGameState(seats, config, 0);
    state = dealHoleCards(state);
    state = advanceStage(state); // flop
    state = advanceStage(state); // turn
    expect(state.stage).toBe(GameStage.Turn);
    expect(state.communityCards).toHaveLength(4);
  });

  it('turn → river 发1张', () => {
    const seats = makeSeats(['A','B','C']);
    let state = createGameState(seats, config, 0);
    state = dealHoleCards(state);
    state = advanceStage(state);
    state = advanceStage(state);
    state = advanceStage(state);
    expect(state.stage).toBe(GameStage.River);
    expect(state.communityCards).toHaveLength(5);
  });

  it('river → showdown 不再发牌', () => {
    const seats = makeSeats(['A','B','C']);
    let state = createGameState(seats, config, 0);
    state = dealHoleCards(state);
    state = advanceStage(state);
    state = advanceStage(state);
    state = advanceStage(state);
    state = advanceStage(state);
    expect(state.stage).toBe(GameStage.Showdown);
    expect(state.communityCards).toHaveLength(5);
  });
});

describe('settleShowdown', () => {
  it('仅剩一人时独得全部底池', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // B,C 弃牌
    dealt.seats[1].player!.hasFolded = true;
    dealt.seats[1].player!.inHand = false;
    dealt.seats[2].player!.hasFolded = true;
    dealt.seats[2].player!.inHand = false;
    expect(isOnlyOneLeft(dealt)).toBe(true);
    const { state: settled, winnings } = settleShowdown(dealt);
    expect(settled.stage).toBe(GameStage.Settled);
    // A 赢得 B,C 的盲注投入
    const total = dealt.seats.reduce((s, x) => s + (x.player?.totalCommitted ?? 0), 0);
    expect(winnings.get('A')).toBe(total);
  });

  it('摊牌时按牌力分配', () => {
    const seats = makeSeats(['A','B']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // 手动给底牌控制结果：A 皇家同花顺，B 高牌
    dealt.seats[0].player!.holeCards = [
      { suit: 'hearts', rank: 'A', value: 14, id: 'A-hearts' },
      { suit: 'hearts', rank: 'K', value: 13, id: 'K-hearts' },
    ];
    dealt.seats[1].player!.holeCards = [
      { suit: 'spades', rank: '2', value: 2, id: '2-spades' },
      { suit: 'clubs', rank: '3', value: 3, id: '3-clubs' },
    ];
    dealt.communityCards = [
      { suit: 'hearts', rank: 'Q', value: 12, id: 'Q-hearts' },
      { suit: 'hearts', rank: 'J', value: 11, id: 'J-hearts' },
      { suit: 'hearts', rank: '10', value: 10, id: '10-hearts' },
      { suit: 'diamonds', rank: '5', value: 5, id: '5-diamonds' },
      { suit: 'diamonds', rank: '7', value: 7, id: '7-diamonds' },
    ];
    const { state: settled, winnings } = settleShowdown(dealt);
    expect(settled.stage).toBe(GameStage.Settled);
    // A 应该赢
    expect(winnings.get('A')).toBeGreaterThan(0);
    expect(winnings.get('B')).toBeUndefined();
  });
});

describe('isRoundComplete', () => {
  it('所有未弃牌玩家下注相等且已行动则完成', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // A call 到20, B call 到20, BB 已是20
    dealt.seats[0].player!.betThisRound = 20;
    dealt.seats[1].player!.betThisRound = 20;
    dealt.seats[2].player!.betThisRound = 20;
    const acted = new Set(['A','B','C']);
    expect(isRoundComplete(dealt, acted)).toBe(true);
  });

  it('有人未行动则未完成', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    dealt.seats[0].player!.betThisRound = 20;
    dealt.seats[1].player!.betThisRound = 20;
    dealt.seats[2].player!.betThisRound = 20;
    const acted = new Set(['A','B']); // C 未行动
    expect(isRoundComplete(dealt, acted)).toBe(false);
  });
});

describe('nextPlayerIndex', () => {
  it('跳过弃牌玩家', () => {
    const seats = makeSeats(['A','B','C']);
    const state = createGameState(seats, config, 0);
    const dealt = dealHoleCards(state);
    // 当前是某玩家，下一个应跳过弃牌者
    dealt.seats[1].player!.hasFolded = true;
    dealt.seats[1].player!.inHand = false;
    dealt.currentPlayerIndex = 0;
    expect(nextPlayerIndex(dealt)).toBe(2);
  });
});

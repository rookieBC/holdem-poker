import { describe, it, expect } from 'vitest';
import { calculatePots, totalPotAmount, distributePots } from '../src/engine/pot';
import type { PublicPlayer } from '../src/types';

function makePlayer(id: string, committed: number, folded = false): PublicPlayer {
  return {
    id, username: id, avatar: 'x', chips: 0,
    isReady: true, isSeated: true, inHand: !folded, hasFolded: folded, isAllIn: false,
    betThisRound: 0, totalCommitted: committed, holeCards: null, lastAction: null,
  };
}

describe('calculatePots - 底池与边池', () => {
  it('无 all-in 时单一底池', () => {
    const players = [
      makePlayer('A', 100),
      makePlayer('B', 100),
      makePlayer('C', 100),
    ];
    const pots = calculatePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligiblePlayerIds.sort()).toEqual(['A','B','C'].sort());
  });

  it('all-in 产生边池', () => {
    // A 全押 100, B 跟 200, C 跟 200
    const players = [
      makePlayer('A', 100),
      makePlayer('B', 200),
      makePlayer('C', 200),
    ];
    const pots = calculatePots(players);
    // 主池 300（每人100），边池 200（B,C 各100）
    expect(pots).toHaveLength(2);
    expect(totalPotAmount(pots)).toBe(500);
    // 主池 A,B,C 都有资格
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligiblePlayerIds.sort()).toEqual(['A','B','C'].sort());
    // 边池只有 B,C
    expect(pots[1].amount).toBe(200);
    expect(pots[1].eligiblePlayerIds.sort()).toEqual(['B','C'].sort());
  });

  it('弃牌玩家贡献成池但无资格', () => {
    // A 弃牌但投入50, B 100, C 100
    const players = [
      makePlayer('A', 50, true),
      makePlayer('B', 100),
      makePlayer('C', 100),
    ];
    const pots = calculatePots(players);
    expect(totalPotAmount(pots)).toBe(250);
    // A 的50进入池但 A 无资格
    expect(pots[0].eligiblePlayerIds.sort()).toEqual(['B','C'].sort());
  });
});

describe('distributePots', () => {
  it('单一赢家独得', () => {
    const pots = [{ amount: 300, eligiblePlayerIds: ['A','B','C'] }];
    const result = distributePots(pots, () => ['B']);
    expect(result.get('B')).toBe(300);
  });

  it('并列平分（余数分配）', () => {
    const pots = [{ amount: 100, eligiblePlayerIds: ['A','B','C'] }];
    const result = distributePots(pots, () => ['A','B','C']);
    // 100/3 = 33*3=99, 余1给第一个
    expect(result.get('A')).toBe(34);
    expect(result.get('B')).toBe(33);
    expect(result.get('C')).toBe(33);
  });
});

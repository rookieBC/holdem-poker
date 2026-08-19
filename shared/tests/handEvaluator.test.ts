import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, findWinners, HandRank } from '../src/engine/handEvaluator';
import { HandRank as HR } from '../src/types';
import { cards } from '../src/test-setup';

describe('evaluateHand - 牌型识别', () => {
  it('识别皇家同花顺', () => {
    const h = evaluateHand(cards(['A','hearts'],['K','hearts'],['Q','hearts'],['J','hearts'],['10','hearts']));
    expect(h.rank).toBe(HR.RoyalFlush);
  });

  it('识别同花顺', () => {
    const h = evaluateHand(cards(['9','clubs'],['8','clubs'],['7','clubs'],['6','clubs'],['5','clubs']));
    expect(h.rank).toBe(HR.StraightFlush);
  });

  it('识别四条', () => {
    const h = evaluateHand(cards(['K','spades'],['K','hearts'],['K','diamonds'],['K','clubs'],['2','hearts']));
    expect(h.rank).toBe(HR.FourOfAKind);
  });

  it('识别葫芦', () => {
    const h = evaluateHand(cards(['Q','spades'],['Q','hearts'],['Q','diamonds'],['J','clubs'],['J','hearts']));
    expect(h.rank).toBe(HR.FullHouse);
  });

  it('识别同花', () => {
    const h = evaluateHand(cards(['A','diamonds'],['J','diamonds'],['8','diamonds'],['4','diamonds'],['2','diamonds']));
    expect(h.rank).toBe(HR.Flush);
  });

  it('识别顺子', () => {
    const h = evaluateHand(cards(['9','spades'],['8','hearts'],['7','diamonds'],['6','clubs'],['5','hearts']));
    expect(h.rank).toBe(HR.Straight);
  });

  it('识别 A-low 顺子（5-4-3-2-A）', () => {
    const h = evaluateHand(cards(['5','spades'],['4','hearts'],['3','diamonds'],['2','clubs'],['A','hearts']));
    expect(h.rank).toBe(HR.Straight);
  });

  it('识别三条', () => {
    const h = evaluateHand(cards(['7','spades'],['7','hearts'],['7','diamonds'],['K','clubs'],['2','hearts']));
    expect(h.rank).toBe(HR.ThreeOfAKind);
  });

  it('识别两对', () => {
    const h = evaluateHand(cards(['J','spades'],['J','hearts'],['5','diamonds'],['5','clubs'],['2','hearts']));
    expect(h.rank).toBe(HR.TwoPair);
  });

  it('识别一对', () => {
    const h = evaluateHand(cards(['A','spades'],['A','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    expect(h.rank).toBe(HR.Pair);
  });

  it('识别高牌', () => {
    const h = evaluateHand(cards(['A','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    expect(h.rank).toBe(HR.HighCard);
  });
});

describe('evaluateHand - 7选5', () => {
  it('从7张中选出最强5张（同花顺优于四条）', () => {
    // 7张含四条 + 同花顺可能：K K K K + 9 8 7（不同花）应选四条
    const h = evaluateHand(cards(['K','spades'],['K','hearts'],['K','diamonds'],['K','clubs'],['9','hearts'],['8','hearts'],['7','hearts']));
    expect(h.rank).toBe(HR.FourOfAKind);
  });

  it('从7张中选出顺子而非两对', () => {
    // 5 6 7 8 9 顺子 + 额外一对
    const h = evaluateHand(cards(['5','spades'],['6','hearts'],['7','diamonds'],['8','clubs'],['9','hearts'],['5','diamonds'],['2','clubs']));
    expect(h.rank).toBe(HR.Straight);
  });
});

describe('compareHands - 牌力比较', () => {
  it('不同牌型：同花顺 > 四条', () => {
    const a = evaluateHand(cards(['9','clubs'],['8','clubs'],['7','clubs'],['6','clubs'],['5','clubs']));
    const b = evaluateHand(cards(['K','spades'],['K','hearts'],['K','diamonds'],['K','clubs'],['2','hearts']));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('同牌型比 kickers：AK高牌 > KQ高牌', () => {
    const a = evaluateHand(cards(['A','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    const b = evaluateHand(cards(['K','spades'],['Q','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('同牌型比 pair：AA > KK', () => {
    const a = evaluateHand(cards(['A','spades'],['A','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    const b = evaluateHand(cards(['K','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('平局：完全相同的牌力', () => {
    const a = evaluateHand(cards(['A','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts']));
    const b = evaluateHand(cards(['A','clubs'],['K','diamonds'],['9','spades'],['4','hearts'],['2','clubs']));
    expect(compareHands(a, b)).toBe(0);
  });
});

describe('findWinners', () => {
  it('返回最强者索引', () => {
    const evals = [
      evaluateHand(cards(['K','spades'],['Q','hearts'],['9','diamonds'],['4','clubs'],['2','hearts'])), // K高牌
      evaluateHand(cards(['A','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts'])), // A高牌
      evaluateHand(cards(['2','spades'],['3','hearts'],['4','diamonds'],['5','clubs'],['7','hearts'])),  // 7高牌
    ];
    expect(findWinners(evals)).toEqual([1]);
  });

  it('并列返回多个索引', () => {
    const evals = [
      evaluateHand(cards(['A','spades'],['K','hearts'],['9','diamonds'],['4','clubs'],['2','hearts'])), // AK高牌
      evaluateHand(cards(['A','clubs'],['K','diamonds'],['9','spades'],['4','hearts'],['2','clubs'])), // AK高牌（平）
    ];
    expect(findWinners(evals)).toEqual([0, 1]);
  });
});

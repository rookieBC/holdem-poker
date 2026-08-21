import type { Card, HandEvaluation } from '../types';
import { HandRank } from '../types';

const HAND_RANK_NAME: Record<HandRank, string> = {
  [HandRank.HighCard]: '高牌',
  [HandRank.Pair]: '一对',
  [HandRank.TwoPair]: '两对',
  [HandRank.ThreeOfAKind]: '三条',
  [HandRank.Straight]: '顺子',
  [HandRank.Flush]: '同花',
  [HandRank.FullHouse]: '葫芦',
  [HandRank.FourOfAKind]: '四条',
  [HandRank.StraightFlush]: '同花顺',
  [HandRank.RoyalFlush]: '皇家同花顺',
};

// ============================================================
// 工具函数
// ============================================================

function sortByValueDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.value - a.value);
}

function countByValue(cards: Card[]): Array<{ value: number; count: number }> {
  const map = new Map<number, number>();
  for (const c of cards) {
    map.set(c.value, (map.get(c.value) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
}

function countBySuit(cards: Card[]): Card[][] {
  const map = new Map<string, Card[]>();
  for (const c of cards) {
    if (!map.has(c.suit)) map.set(c.suit, []);
    map.get(c.suit)!.push(c);
  }
  return Array.from(map.values());
}

/**
 * 判断 5 张牌是否构成顺子，返回顺子最高牌点数（0 表示非顺子）
 * 支持 A-low 顺子（A-2-3-4-5）
 */
function straightHigh(cards: Card[]): number {
  const vals = [...new Set(cards.map((c) => c.value))].sort((a, b) => b - a);
  if (vals.length < 5) return 0;

  for (let i = 0; i <= vals.length - 5; i++) {
    if (vals[i] - vals[i + 4] === 4) return vals[i];
  }

  // A-low 顺子（5-4-3-2-A）：A=14 当作 1
  if (vals.includes(14) && vals.includes(5) && vals.includes(4) && vals.includes(3) && vals.includes(2)) {
    return 5;
  }

  return 0;
}

// ============================================================
// 5 张牌评估
// ============================================================

function evaluate5(cards: Card[]): HandEvaluation {
  const sorted = sortByValueDesc(cards);
  const valueCounts = countByValue(cards);
  const suitGroups = countBySuit(cards);
  const isFlush = suitGroups.length === 1;
  const straight = straightHigh(cards);
  const counts = valueCounts.map((v) => v.count);
  const topCounts = counts.slice(0, 2);

  // 同花顺 / 皇家同花顺
  if (isFlush && straight > 0) {
    if (straight === 14) {
      return { rank: HandRank.RoyalFlush, tiebreakers: [HandRank.RoyalFlush, 14], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.RoyalFlush] };
    }
    return { rank: HandRank.StraightFlush, tiebreakers: [HandRank.StraightFlush, straight], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.StraightFlush] };
  }

  // 四条
  if (topCounts[0] === 4) {
    return { rank: HandRank.FourOfAKind, tiebreakers: [HandRank.FourOfAKind, valueCounts[0].value, valueCounts[1].value], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.FourOfAKind] };
  }

  // 葫芦
  if (topCounts[0] === 3 && topCounts[1] === 2) {
    return { rank: HandRank.FullHouse, tiebreakers: [HandRank.FullHouse, valueCounts[0].value, valueCounts[1].value], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.FullHouse] };
  }

  // 同花
  if (isFlush) {
    return { rank: HandRank.Flush, tiebreakers: [HandRank.Flush, ...sorted.slice(0, 5).map((c) => c.value)], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.Flush] };
  }

  // 顺子
  if (straight > 0) {
    return { rank: HandRank.Straight, tiebreakers: [HandRank.Straight, straight], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.Straight] };
  }

  // 三条
  if (topCounts[0] === 3) {
    const kickers = valueCounts.slice(1, 3).map((v) => v.value);
    return { rank: HandRank.ThreeOfAKind, tiebreakers: [HandRank.ThreeOfAKind, valueCounts[0].value, ...kickers], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.ThreeOfAKind] };
  }

  // 两对
  if (topCounts[0] === 2 && topCounts[1] === 2) {
    return { rank: HandRank.TwoPair, tiebreakers: [HandRank.TwoPair, valueCounts[0].value, valueCounts[1].value, valueCounts[2].value], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.TwoPair] };
  }

  // 一对
  if (topCounts[0] === 2) {
    const kickers = valueCounts.slice(1, 4).map((v) => v.value);
    return { rank: HandRank.Pair, tiebreakers: [HandRank.Pair, valueCounts[0].value, ...kickers], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.Pair] };
  }

  // 高牌
  return { rank: HandRank.HighCard, tiebreakers: [HandRank.HighCard, ...sorted.slice(0, 5).map((c) => c.value)], bestFive: sorted.slice(0, 5), name: HAND_RANK_NAME[HandRank.HighCard] };
}


// ============================================================
// 7 选 5 最优组合
// ============================================================

function combinations<T>(arr: T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (arr.length < n) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, n - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, n);
  return [...withFirst, ...withoutFirst];
}

/**
 * 7选5最优牌力评估
 * 输入：玩家2底牌 + 公共牌，共5~7张
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    return {
      rank: HandRank.HighCard,
      tiebreakers: [HandRank.HighCard, ...sorted.map((c) => c.value)],
      bestFive: sorted,
      name: HAND_RANK_NAME[HandRank.HighCard],
    };
  }

  const combos = combinations(cards, 5);
  let best: HandEvaluation | null = null;
  for (const combo of combos) {
    const evalResult = evaluate5(combo);
    if (!best || compareHands(evalResult, best) > 0) {
      best = evalResult;
    }
  }
  return best!;
}

/** 比较两个评估结果：正数=a胜，负数=b胜，0=平 */
export function compareHands(a: HandEvaluation, b: HandEvaluation): number {
  const maxLen = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < maxLen; i++) {
    const av = a.tiebreakers[i] ?? 0;
    const bv = b.tiebreakers[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** 从多个评估结果中找出胜者索引（可并列） */
export function findWinners(evals: HandEvaluation[]): number[] {
  let bestIdx = [0];
  let best = evals[0];
  for (let i = 1; i < evals.length; i++) {
    const cmp = compareHands(evals[i], best);
    if (cmp > 0) {
      best = evals[i];
      bestIdx = [i];
    } else if (cmp === 0) {
      bestIdx.push(i);
    }
  }
  return bestIdx;
}

export { HAND_RANK_NAME };


/**
 * 按牌型逻辑排序最优5张牌，让组成牌型的牌排在前面。
 * - 四条: 4张同点 + 1张散牌
 * - 葫芦: 3张同点 + 2张同点
 * - 三条: 3张同点 + 2张散牌(降序)
 * - 两对: 大对 + 大对 + 小对 + 小对 + 散牌
 * - 一对: 对子 + 3张散牌(降序)
 * - 同花/顺子/同花顺/皇家同花顺/高牌: 按点数降序
 */
export function sortBestFive(cards: Card[], rank: HandRank): Card[] {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  if (rank === HandRank.FourOfAKind || rank === HandRank.FullHouse ||
      rank === HandRank.ThreeOfAKind || rank === HandRank.TwoPair ||
      rank === HandRank.Pair) {
    // 按点数分组，组内按点数降序，组间按数量降序再按点数降序
    const groups = new Map<number, Card[]>();
    for (const c of sorted) {
      if (!groups.has(c.value)) groups.set(c.value, []);
      groups.get(c.value)!.push(c);
    }
    const groupList = Array.from(groups.values()).sort(
      (a, b) => b.length - a.length || b[0].value - a[0].value,
    );
    return groupList.flat();
  }
  // 顺子、同花、高牌等：直接按点数降序
  return sorted;
}

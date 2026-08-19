import type { Card, Rank, Suit } from '../types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** rank -> value 映射 */
export function rankValue(rank: Rank): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

/** 花色符号（用于UI） */
export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/** 花色颜色（红/黑） */
export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** 创建一副标准52张牌 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank), id: `${rank}-${suit}` });
    }
  }
  return deck;
}

/** Fisher-Yates 洗牌（返回新数组） */
export function shuffle(deck: Card[], rng: () => number = Math.random): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 从牌堆顶部发 n 张牌 */
export function draw(deck: Card[], n: number): { drawn: Card[]; rest: Card[] } {
  return { drawn: deck.slice(0, n), rest: deck.slice(n) };
}

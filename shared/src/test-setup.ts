import type { Card, Suit, Rank } from './types';
import { rankValue } from './engine/cards.js';

/** 閺嬪嫰鈧姳绔村鐘靛 */
export function card(rank: Rank, suit: Suit): Card {
  return { suit, rank, value: rankValue(rank), id: `${rank}-${suit}` };
}

/** 閺嬪嫰鈧姴顦垮鐘靛 */
export function cards(...defs: Array<[Rank, Suit]>): Card[] {
  return defs.map(([r, s]) => card(r, s));
}

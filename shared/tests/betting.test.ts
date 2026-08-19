import { describe, it, expect } from 'vitest';
import { validateAction, applyAction, minRaiseTo } from '../src/engine/betting';
import type { PublicPlayer } from '../src/types';

function makePlayer(chips = 1000, betThisRound = 0): PublicPlayer {
  return {
    id: 'p1', username: 'p', avatar: 'x', chips,
    isReady: true, isSeated: true, inHand: true, hasFolded: false, isAllIn: false,
    betThisRound, totalCommitted: betThisRound, holeCards: null, lastAction: null,
  };
}

describe('validateAction - 动作合法性', () => {
  it('fold 总是合法', () => {
    const p = makePlayer();
    expect(validateAction(p, 'fold', 0, 20).ok).toBe(true);
  });

  it('check 在需跟注时非法', () => {
    const p = makePlayer();
    expect(validateAction(p, 'check', 50, 20).ok).toBe(false);
  });

  it('check 在无需跟注时合法', () => {
    const p = makePlayer();
    expect(validateAction(p, 'check', 0, 20).ok).toBe(true);
  });

  it('call 在需跟注时合法', () => {
    const p = makePlayer();
    expect(validateAction(p, 'call', 50, 20).ok).toBe(true);
  });

  it('raise 必须高于当前下注', () => {
    const p = makePlayer();
    expect(validateAction(p, 'raise', 50, 20, 50).ok).toBe(false);   // 等于当前
    expect(validateAction(p, 'raise', 50, 20, 70).ok).toBe(true);     // 高于当前且差额>=minRaise
  });

  it('raise 差额不足 minRaise 非法', () => {
    const p = makePlayer(1000, 40);
    // currentBet=50, betThisRound=40, raise到60 -> 差额20 = minRaise(20) 合法
    expect(validateAction(p, 'raise', 50, 20, 60).ok).toBe(true);
    // raise到55 -> 差额15 < 20 非法
    expect(validateAction(p, 'raise', 50, 20, 55).ok).toBe(false);
  });

  it('all-in 合法（有筹码时）', () => {
    const p = makePlayer(500);
    expect(validateAction(p, 'all-in', 50, 20).ok).toBe(true);
  });

  it('弃牌玩家不能行动', () => {
    const p = makePlayer();
    p.hasFolded = true;
    expect(validateAction(p, 'call', 50, 20).ok).toBe(false);
  });
});

describe('applyAction - 筹码变动', () => {
  it('call 扣除正确筹码', () => {
    const p = makePlayer(1000, 0);
    const spent = applyAction(p, 'call', 50, 20);
    expect(spent).toBe(50);
    expect(p.chips).toBe(950);
    expect(p.betThisRound).toBe(50);
    expect(p.isAllIn).toBe(false);
  });

  it('call 筹码不足时全押', () => {
    const p = makePlayer(30, 0);
    const spent = applyAction(p, 'call', 50, 20);
    expect(spent).toBe(30);
    expect(p.chips).toBe(0);
    expect(p.isAllIn).toBe(true);
    expect(p.betThisRound).toBe(30);
  });

  it('raise 扣除加注差额', () => {
    const p = makePlayer(1000, 20);
    const spent = applyAction(p, 'raise', 50, 100);
    expect(spent).toBe(80); // 100-20
    expect(p.betThisRound).toBe(100);
    expect(p.chips).toBe(920);
  });

  it('all-in 投入全部筹码', () => {
    const p = makePlayer(500, 20);
    const spent = applyAction(p, 'all-in', 50, 20);
    expect(spent).toBe(500);
    expect(p.chips).toBe(0);
    expect(p.isAllIn).toBe(true);
    expect(p.betThisRound).toBe(520);
  });

  it('fold 标记弃牌', () => {
    const p = makePlayer();
    applyAction(p, 'fold', 50, 20);
    expect(p.hasFolded).toBe(true);
    expect(p.inHand).toBe(false);
  });
});

describe('minRaiseTo', () => {
  it('返回当前下注 + minRaise', () => {
    expect(minRaiseTo(50, 20)).toBe(70);
  });
});

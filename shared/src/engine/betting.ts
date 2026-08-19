import type { PublicPlayer, ActionType } from '../types';

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

/**
 * 校验玩家动作是否合法
 * @param player 行动玩家
 * @param currentBet 当前轮最高下注额
 * @param minRaise 最小加注额
 * @param amount 动作金额（raise 时为加注到总额）
 */
export function validateAction(
  player: PublicPlayer,
  action: ActionType,
  currentBet: number,
  minRaise: number,
  amount?: number,
): ActionResult {
  if (player.hasFolded) return { ok: false, reason: '已弃牌' };
  if (!player.inHand) return { ok: false, reason: '不在牌局中' };
  if (player.isAllIn) return { ok: false, reason: '已全押，无法行动' };

  const toCall = currentBet - player.betThisRound;

  switch (action) {
    case 'fold':
      return { ok: true };

    case 'check':
      if (toCall > 0) return { ok: false, reason: '当前需跟注，不能过牌' };
      return { ok: true };

    case 'call': {
      if (toCall <= 0) return { ok: false, reason: '无需跟注，应过牌' };
      // 筹码不足则视为 all-in call
      return { ok: true };
    }

    case 'raise': {
      if (amount === undefined) return { ok: false, reason: '加注需指定金额' };
      // raise 的 amount = 加注后的本轮总额
      const raiseTotal = amount;
      const raiseDelta = raiseTotal - player.betThisRound;
      if (raiseTotal <= currentBet) {
        return { ok: false, reason: '加注金额必须高于当前下注' };
      }
      // 最小加注：加注差额 >= 上次加注幅度（简化为 >= minRaise）
      if (raiseDelta < minRaise) {
        return { ok: false, reason: `最小加注差额为 ${minRaise}` };
      }
      if (raiseTotal > player.betThisRound + player.chips) {
        return { ok: false, reason: '筹码不足' };
      }
      return { ok: true };
    }

    case 'all-in': {
      if (player.chips <= 0) return { ok: false, reason: '无筹码可全押' };
      return { ok: true };
    }

    default:
      return { ok: false, reason: '未知动作' };
  }
}

/**
 * 应用动作到玩家，返回实际下注金额（从筹码中扣除的）
 */
export function applyAction(
  player: PublicPlayer,
  action: ActionType,
  currentBet: number,
  amount?: number,
): number {
  const toCall = currentBet - player.betThisRound;

  switch (action) {
    case 'fold':
      player.hasFolded = true;
      player.inHand = false;
      player.lastAction = { type: 'fold' };
      return 0;

    case 'check':
      player.lastAction = { type: 'check' };
      return 0;

    case 'call': {
      const need = Math.min(toCall, player.chips);
      player.chips -= need;
      player.betThisRound += need;
      player.totalCommitted += need;
      if (player.chips === 0) player.isAllIn = true;
      player.lastAction = { type: 'call', amount: need };
      return need;
    }

    case 'raise': {
      const raiseTotal = amount ?? 0;
      const need = Math.min(raiseTotal - player.betThisRound, player.chips);
      player.chips -= need;
      player.betThisRound += need;
      player.totalCommitted += need;
      if (player.chips === 0) player.isAllIn = true;
      player.lastAction = { type: 'raise', amount: raiseTotal };
      return need;
    }

    case 'all-in': {
      const need = player.chips;
      player.chips = 0;
      player.betThisRound += need;
      player.totalCommitted += need;
      player.isAllIn = true;
      player.lastAction = { type: 'all-in', amount: player.betThisRound };
      return need;
    }

    default:
      return 0;
  }
}

/**
 * 计算最小加注到总额（= 当前下注 + minRaise）
 */
export function minRaiseTo(currentBet: number, minRaise: number): number {
  return currentBet + minRaise;
}

import type { Pot, PublicPlayer } from '../types';

/**
 * 根据玩家本局累计投入计算主底池 + 边池
 *
 * 算法：
 * 1. 取所有未弃牌玩家的 totalCommitted，去重升序排列，得到各"层级线"
 * 2. 每个层级线 = 该层及以下层级的玩家数量 × 该层差值，分配给该层级对应的底池
 * 3. 每个底池的 eligiblePlayerIds = 贡献达到该层级的未弃牌玩家
 *
 * 例：A全押100, B跟注200, C跟注200
 *   层级线 [100, 200]
 *   底池1（100层）：3人×100=300，资格 = A,B,C
 *   底池2（100→200层）：2人×100=200，资格 = B,C
 *   A 只能争底池1（300），B,C 可争底池1+2（500）
 */
export function calculatePots(players: PublicPlayer[]): Pot[] {
  // 仅考虑有投入的玩家（含已弃牌，弃牌玩家的投入已成池但无资格）
  const committed = players.filter((p) => p.totalCommitted > 0);
  if (committed.length === 0) return [];

  // 参与资格：未弃牌的玩家
  const eligible = committed.filter((p) => !p.hasFolded);

  // 各玩家投入金额去重升序
  const levelSet = new Set<number>();
  for (const p of committed) levelSet.add(p.totalCommitted);
  const levelLines = Array.from(levelSet).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prevLevel = 0;

  for (const level of levelLines) {
    const layerAmount = level - prevLevel;
    if (layerAmount <= 0) continue;

    // 贡献达到该层级的玩家（含已弃牌者贡献，但资格仅未弃牌）
    const contributorsAtLayer = committed.filter((p) => p.totalCommitted >= level);
    const potAmount = contributorsAtLayer.length * layerAmount;

    // 有资格争夺该底池的玩家 = 投入 >= 该层 且 未弃牌
    const eligibles = contributorsAtLayer
      .filter((p) => !p.hasFolded)
      .map((p) => p.id);

    // 合并到已有底池（金额为0的空池不创建）
    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligibles,
      });
    }

    prevLevel = level;
  }

  // 合并连续相同资格的底池（简化展示）
  return mergeConsecutivePots(pots);
}

/** 合并资格完全相同的相邻底池 */
function mergeConsecutivePots(pots: Pot[]): Pot[] {
  if (pots.length === 0) return [];
  const merged: Pot[] = [{ ...pots[0] }];
  for (let i = 1; i < pots.length; i++) {
    const last = merged[merged.length - 1];
    const cur = pots[i];
    const sameEligible =
      last.eligiblePlayerIds.length === cur.eligiblePlayerIds.length &&
      last.eligiblePlayerIds.every((id) => cur.eligiblePlayerIds.includes(id));
    if (sameEligible) {
      last.amount += cur.amount;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** 计算所有底池总额（展示用） */
export function totalPotAmount(pots: Pot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * 按底池分配奖金给赢家
 * @param pots 底池列表
 * @param winnersByPlayerId 每个玩家的牌力评估结果（playerId -> 是否赢家集合），简化为 playerId -> 分得金额
 * @returns playerId -> 分得筹码金额
 */
export function distributePots(
  pots: Pot[],
  // 每个底池的赢家id列表
  winnersForPot: (pot: Pot, potIndex: number) => string[],
): Map<string, number> {
  const result = new Map<string, number>();
  pots.forEach((pot, i) => {
    const winners = winnersForPot(pot, i);
    if (winners.length === 0 || pot.amount === 0) return;
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const wId of winners) {
      let give = share;
      if (remainder > 0) {
        give += 1;
        remainder -= 1;
      }
      result.set(wId, (result.get(wId) ?? 0) + give);
    }
  });
  return result;
}


import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/game';
import { useAccountStore } from '../store/account';
import type { WinnerInfo } from '@holdem/shared';

/**
 * 胜负横幅：结算时弹出 YOU WIN / YOU LOSE。
 * - win 事件触发显示
 * - 下一局开始（deal-hole）或游戏状态清除时自动消失
 */
export function ResultBanner() {
  const lastEvent = useGameStore((s) => s.lastEvent);
  const gameState = useGameStore((s) => s.state);
  const account = useAccountStore((s) => s.account);
  const [result, setResult] = useState<{ isWin: boolean; amount: number; handName: string | null } | null>(null);

  useEffect(() => {
    // 游戏状态被清除（回到座位页）时，隐藏横幅
    if (!gameState) {
      setResult(null);
      return;
    }
    // 新一局开始（deal-hole）时，隐藏上一局结果横幅
    if (lastEvent && lastEvent.type === 'deal-hole') {
      setResult(null);
      return;
    }
    // win 事件触发显示
    if (!lastEvent || lastEvent.type !== 'win') return;
    if (!account) return;

    const winners = lastEvent.data?.winners as WinnerInfo[] | undefined;
    if (!winners) return;

    const myWin = winners.find((w) => w.playerId === account.id);
    if (myWin) {
      setResult({ isWin: true, amount: myWin.amount, handName: myWin.handName });
    } else {
      const winnerHand = winners[0]?.handName ?? null;
      setResult({ isWin: false, amount: 0, handName: winnerHand });
    }
  }, [lastEvent, account, gameState]);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="result-banner-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={result.isWin ? 'result-banner result-win' : 'result-banner result-lose'}
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 15 }}
          >
            {result.isWin ? (
              <>
                <div className="result-title font-screen glow-yellow">YOU WIN!</div>
                {result.amount > 0 && (
                  <div className="result-amount font-mono glow-yellow">+{result.amount.toLocaleString()}</div>
                )}
                {result.handName && (
                  <div className="result-hand font-screen text-neon-cyan">{result.handName}</div>
                )}
              </>
            ) : (
              <>
                <div className="result-title font-screen glow-pink">YOU LOSE</div>
                {result.handName && (
                  <div className="result-hand font-screen text-gray-400">对手: {result.handName}</div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

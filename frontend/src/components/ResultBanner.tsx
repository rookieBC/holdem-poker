import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/game';
import { useAccountStore } from '../store/account';
import type { WinnerInfo } from '@holdem/shared';

interface ResultBannerProps {
  /** 本局开始前的筹码（用于算输赢差额），可选 */
}

/**
 * 胜负横幅：结算时弹出 YOU WIN / YOU LOSE，几秒后淡出。
 * 消费 game store 的 lastEvent，在 win 事件时触发。
 */
export function ResultBanner({}: ResultBannerProps) {
  const lastEvent = useGameStore((s) => s.lastEvent);
  const account = useAccountStore((s) => s.account);
  const [result, setResult] = useState<{ isWin: boolean; amount: number; handName: string | null } | null>(null);

  useEffect(() => {
    if (!lastEvent || lastEvent.type !== 'win') return;
    if (!account) return;

    const winners = lastEvent.data?.winners as WinnerInfo[] | undefined;
    if (!winners) return;

    const myWin = winners.find((w) => w.playerId === account.id);
    if (myWin) {
      setResult({ isWin: true, amount: myWin.amount, handName: myWin.handName });
    } else {
      // 输了：赢家信息用于展示对手牌型，输的金额前端无法精确得知（不传），显示 YOU LOSE
      const winnerHand = winners[0]?.handName ?? null;
      setResult({ isWin: false, amount: 0, handName: winnerHand });
    }

    // 3.5 秒后淡出
    const timer = setTimeout(() => setResult(null), 3500);
    return () => clearTimeout(timer);
  }, [lastEvent, account]);

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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState } from '@holdem/shared';
import { useAccountStore } from '../store/account';
import { useRoomStore } from '../store/room';

interface ActionPanelProps {
  state: GameState;
}

export function ActionPanel({ state }: ActionPanelProps) {
  const account = useAccountStore((s) => s.account);
  const { takeAction, lastError } = useRoomStore();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  // 所有 hooks 必须在条件 return 之前调用
  const mySeat = state.seats[state.currentPlayerIndex];
  const myPlayer = mySeat?.player;
  const isMyTurn = !!account && !!myPlayer && myPlayer.id === account.id;

  const toCall = myPlayer ? state.currentBet - myPlayer.betThisRound : 0;
  const canCheck = isMyTurn && toCall <= 0;
  const canCall = isMyTurn && toCall > 0;
  const minRaiseTo = myPlayer ? state.currentBet + state.minRaise : 0;
  const maxAffordable = myPlayer ? myPlayer.betThisRound + myPlayer.chips : 0;
  const canRaise = isMyTurn && maxAffordable > state.currentBet;
  const canAllIn = isMyTurn && !!myPlayer && myPlayer.chips > 0;
  const callAmount = myPlayer ? Math.min(toCall, myPlayer.chips) : 0;
  const raiseMin = Math.min(minRaiseTo, maxAffordable);
  const raiseMax = maxAffordable;

  // 初始化加注金额（hooks 在 return 之前）
  useEffect(() => {
    if (showRaiseSlider && canRaise) {
      setRaiseAmount(raiseMin);
    }
  }, [showRaiseSlider, canRaise, raiseMin]);

  if (!account) return null;

  // 非我回合
  if (!myPlayer || !isMyTurn) {
    const me = state.seats.find((s) => s.player?.id === account.id)?.player;
    if (me && me.inHand && !me.hasFolded && !me.isAllIn) {
      return (
        <div className="action-panel-wrapper waiting">
          <span className="font-screen text-xs glow-cyan blink">▶ 等待其他玩家行动 ◀</span>
        </div>
      );
    }
    return null;
  }

  const handleFold = () => takeAction({ type: 'fold' });
  const handleCheck = () => takeAction({ type: 'check' });
  const handleCall = () => takeAction({ type: 'call' });
  const handleAllIn = () => takeAction({ type: 'all-in' });
  const handleRaise = () => {
    takeAction({ type: 'raise', amount: raiseAmount });
    setShowRaiseSlider(false);
  };

  const potForRaise = state.currentPot + myPlayer.betThisRound;
  const quickRaises = [
    { label: 'MIN', value: raiseMin },
    { label: '1/2池', value: Math.min(Math.round(potForRaise * 0.5) + state.currentBet, raiseMax) },
    { label: '满池', value: Math.min(Math.round(potForRaise) + state.currentBet, raiseMax) },
  ];

  return (
    <div className="action-panel-wrapper">
      {lastError && (
        <div className="action-error font-mono text-sm text-neon-red mb-1 blink">
          ⚠ {lastError}
        </div>
      )}

      <div className="action-panel">
        {/* 加注滑杆区（展开时显示） */}
        <AnimatePresence>
          {showRaiseSlider && canRaise && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="raise-section"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="font-screen text-[10px] glow-green">加注到</span>
                <input
                  type="range"
                  min={raiseMin}
                  max={raiseMax}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="raise-slider"
                />
                <span className="font-mono text-xl glow-yellow w-20 text-center">
                  {raiseAmount}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {quickRaises.map((q) => (
                  <button
                    key={q.label}
                    className="pixel-btn text-[10px]"
                    onClick={() => setRaiseAmount(Math.max(raiseMin, Math.min(q.value, raiseMax)))}
                    disabled={q.value < raiseMin}
                  >
                    {q.label}
                  </button>
                ))}
                <button
                  className="pixel-btn pixel-btn-green text-[10px]"
                  onClick={handleRaise}
                >
                  ✓ 确认加注 {raiseAmount}
                </button>
                <button
                  className="pixel-btn text-[10px]"
                  onClick={() => setShowRaiseSlider(false)}
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主动作栏 */}
        <div className="flex gap-2 flex-wrap justify-center items-center">
          <button
            className="pixel-btn pixel-btn-pink"
            onClick={handleFold}
          >
            弃牌
          </button>

          <button
            className="pixel-btn pixel-btn-cyan"
            onClick={handleCheck}
            disabled={!canCheck}
          >
            过牌
          </button>

          {canCall && (
            <button
              className="pixel-btn pixel-btn-cyan"
              onClick={handleCall}
            >
              跟注 {callAmount}
            </button>
          )}

          {canRaise && (
            <button
              className="pixel-btn pixel-btn-green"
              onClick={() => setShowRaiseSlider((v) => !v)}
            >
              {showRaiseSlider ? '▲ 收起' : '加注 ▼'}
            </button>
          )}

          {canAllIn && (
            <button
              className="pixel-btn pixel-btn-pink"
              onClick={handleAllIn}
            >
              全押 {myPlayer.chips}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  // 找到自己的玩家信息（不依赖 currentPlayerIndex）
  const mySeat = state.seats.find((s) => s.player?.id === account?.id);
  const myPlayer = mySeat?.player ?? null;
  const isMyTurn =
    !!account &&
    !!myPlayer &&
    myPlayer.id === account.id &&
    state.currentPlayerIndex === mySeat!.index &&
    state.stage !== 'settled' &&
    state.stage !== 'showdown';

  const isFolded = myPlayer?.hasFolded ?? false;
  const isAllIn = myPlayer?.isAllIn ?? false;
  const isSpectating = !myPlayer;

  // 可行动状态：轮到我 + 没弃牌 + 没全押 + 不是旁观
  const canAct = isMyTurn && !isFolded && !isAllIn && !isSpectating;

  const toCall = myPlayer ? state.currentBet - myPlayer.betThisRound : 0;
  const canCheck = canAct && toCall <= 0;
  const canCall = canAct && toCall > 0;
  const minRaiseTo = myPlayer ? state.currentBet + state.minRaise : 0;
  const maxAffordable = myPlayer ? myPlayer.betThisRound + myPlayer.chips : 0;
  const canRaise = canAct && maxAffordable > state.currentBet;
  const canAllIn = canAct && !!myPlayer && myPlayer.chips > 0;
  const callAmount = myPlayer ? Math.min(toCall, myPlayer.chips) : 0;
  const raiseMin = Math.min(minRaiseTo, maxAffordable);
  const raiseMax = maxAffordable;

  // 加注滑杆初始化
  useEffect(() => {
    if (showRaiseSlider && canRaise) {
      setRaiseAmount(raiseMin);
    }
  }, [showRaiseSlider, canRaise, raiseMin]);

  // 状态提示文字
  let statusText = '';
  if (isSpectating) statusText = '旁观中';
  else if (isFolded) statusText = '已弃牌 · 等待本局结束';
  else if (isAllIn) statusText = '已全押 · 等待结算';
  else if (!isMyTurn) statusText = '等待其他玩家行动…';
  else statusText = '▶ 轮到你行动';

  const handleFold = () => canAct && takeAction({ type: 'fold' });
  const handleCheck = () => canAct && takeAction({ type: 'check' });
  const handleCall = () => canAct && takeAction({ type: 'call' });
  const handleAllIn = () => canAct && takeAction({ type: 'all-in' });
  const handleRaise = () => {
    if (canAct) {
      takeAction({ type: 'raise', amount: raiseAmount });
      setShowRaiseSlider(false);
    }
  };

  const potForRaise = state.currentPot + (myPlayer?.betThisRound ?? 0);
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

      <div className={'action-panel' + (canAct ? ' action-panel-active' : '')}>
        {/* 状态提示（常驻） */}
        <div className={'action-status ' + (canAct ? 'glow-yellow blink' : 'text-gray-500')}>
          {statusText}
        </div>

        {/* 加注滑杆区（仅可加注时展开） */}
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
                <button className="pixel-btn pixel-btn-green text-[10px]" onClick={handleRaise}>
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

        {/* 主动作栏（常驻，非自己回合全部禁用） */}
        <div className="flex gap-2 flex-wrap justify-center items-center">
          <button className="pixel-btn pixel-btn-pink" onClick={handleFold} disabled={!canAct}>
            弃牌
          </button>

          <button className="pixel-btn pixel-btn-cyan" onClick={handleCheck} disabled={!canCheck}>
            过牌
          </button>

          <button className="pixel-btn pixel-btn-cyan" onClick={handleCall} disabled={!canCall}>
            跟注 {canCall ? callAmount : ''}
          </button>

          <button
            className="pixel-btn pixel-btn-green"
            onClick={() => setShowRaiseSlider((v) => !v)}
            disabled={!canRaise}
          >
            {showRaiseSlider ? '▲ 收起' : '加注 ▼'}
          </button>

          <button className="pixel-btn pixel-btn-pink" onClick={handleAllIn} disabled={!canAllIn}>
            全押 {canAllIn ? myPlayer!.chips : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

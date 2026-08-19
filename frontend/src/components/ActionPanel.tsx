import { useState, useEffect } from 'react';
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

  const mySeat = state.seats.find((s) => s.player?.id === account?.id);
  const myPlayer = mySeat?.player ?? null;
  const isMyTurn =
    !!account && !!myPlayer && myPlayer.id === account.id &&
    state.currentPlayerIndex === mySeat!.index &&
    state.stage !== 'settled' && state.stage !== 'showdown';

  const isFolded = myPlayer?.hasFolded ?? false;
  const isAllIn = myPlayer?.isAllIn ?? false;
  const isSpectating = !myPlayer;
  const canAct = isMyTurn && !isFolded && !isAllIn && !isSpectating;

  const toCall = myPlayer ? state.currentBet - myPlayer.betThisRound : 0;
  const canCheck = canAct && toCall <= 0;
  const canCall = canAct && toCall > 0;
  const minRaiseTo = myPlayer ? state.currentBet + state.minRaise : 0;
  const maxAffordable = myPlayer ? myPlayer.betThisRound + myPlayer.chips : 0;
  const canRaise = canAct && maxAffordable > state.currentBet;
  const canAllIn = canAct && !!myPlayer && myPlayer.chips > 0;
  const callAmount = myPlayer ? Math.min(toCall, myPlayer.chips) : 0;
  // 最小单位为10，向上取整
  const raiseMin = Math.ceil(Math.min(minRaiseTo, maxAffordable) / 10) * 10;
  const raiseMax = Math.floor(maxAffordable / 10) * 10;

  useEffect(() => {
    if (canRaise) setRaiseAmount(raiseMin);  // raiseMin 已是10的倍数
  }, [canRaise, raiseMin]);

  let statusText = '';
  if (isSpectating) statusText = '旁观中';
  else if (isFolded) statusText = '已弃牌 · 等待本局结束';
  else if (isAllIn) statusText = '已全押 · 等待结算';
  else if (!isMyTurn) statusText = '等待其他玩家行动…';
  else statusText = '▶ 轮到你行动';

  const send = (type: 'fold' | 'check' | 'call' | 'all-in') =>
    canAct && takeAction({ type });
  const sendRaise = () =>
    canRaise && takeAction({ type: 'raise', amount: raiseAmount });

  const potForRaise = state.currentPot + (myPlayer?.betThisRound ?? 0);

  return (
    <div className="action-panel-wrapper">
      {lastError && (
        <div className="action-error font-mono text-sm text-neon-red mb-1 blink">
          ⚠ {lastError}
        </div>
      )}

      <div className={'action-panel' + (canAct ? ' action-panel-active' : '')}>
        {/* 状态提示 */}
        <div className={'action-status ' + (canAct ? 'glow-yellow blink' : 'text-gray-500')}>
          {statusText}
        </div>

        {/* 第一行：主操作按钮 */}
        <div className="flex gap-2 flex-wrap justify-center items-center">
          <button className="pixel-btn pixel-btn-pink" onClick={() => send('fold')} disabled={!canAct}>
            弃牌
          </button>
          <button className="pixel-btn pixel-btn-cyan" onClick={() => send('check')} disabled={!canCheck}>
            过牌
          </button>
          <button className="pixel-btn pixel-btn-cyan" onClick={() => send('call')} disabled={!canCall}>
            跟注 {canCall ? callAmount : ''}
          </button>
          <button className="pixel-btn pixel-btn-pink" onClick={() => send('all-in')} disabled={!canAllIn}>
            全押 {canAllIn ? myPlayer!.chips : ''}
          </button>
        </div>

        {/* 第二行：加注区（常驻显示，不展开收起） */}
        <div className="raise-row">
          <span className="font-screen text-[10px] glow-green shrink-0">加注</span>
          <input
            type="range"
            min={raiseMin}
            max={raiseMax}
            step={10}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="raise-slider"
            disabled={!canRaise}
          />
          <span className="font-mono text-lg glow-yellow w-16 text-center shrink-0">
            {canRaise ? raiseAmount : '—'}
          </span>
          <button
            className="pixel-btn pixel-btn-green text-[10px] shrink-0"
            onClick={sendRaise}
            disabled={!canRaise}
          >
            确认
          </button>
          <button
            className="pixel-btn text-[9px] shrink-0"
            disabled={!canRaise}
            onClick={() => setRaiseAmount(Math.min(Math.ceil((potForRaise * 0.5 + state.currentBet) / 10) * 10, raiseMax))}
          >
            1/2池
          </button>
          <button
            className="pixel-btn text-[9px] shrink-0"
            disabled={!canRaise}
            onClick={() => setRaiseAmount(Math.min(Math.ceil((potForRaise + state.currentBet) / 10) * 10, raiseMax))}
          >
            满池
          </button>
        </div>
      </div>
    </div>
  );
}

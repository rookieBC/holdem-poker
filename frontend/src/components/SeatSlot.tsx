import { PixelCard } from './PixelCard';
import type { Seat, PublicPlayer, ActionType } from '@holdem/shared';
import { GameStage } from '@holdem/shared';

interface SeatSlotProps {
  seat: Seat;
  myPlayerId: string;
  stage: GameStage;
  isActive: boolean; // 是否当前行动玩家
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

const ACTION_LABEL: Record<ActionType, string> = {
  fold: 'FOLD',
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  'all-in': 'ALL IN',
};

export function SeatSlot({
  seat,
  myPlayerId,
  stage,
  isActive,
  isDealer,
  isSmallBlind,
  isBigBlind,
}: SeatSlotProps) {
  const p = seat.player;

  // 空座
  if (!p) {
    return (
      <div className="player-card seat-empty-table">
        <span className="font-mono text-sm text-gray-600">空座</span>
      </div>
    );
  }

  const isMe = p.id === myPlayerId;
  const isShowdown = stage === GameStage.Showdown || stage === GameStage.Settled;
  // 底牌可见性：自己始终可见；对手仅在摊牌后可见；否则显示牌背
  const showHoleCards = isMe || (isShowdown && !p.hasFolded);

  const cardClass =
    'player-card ' +
    (isActive ? 'is-active ' : '') +
    (p.hasFolded ? 'is-folded ' : '') +
    (p.isAllIn ? 'is-allin ' : '');

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 底牌 */}
      {p.holeCards && p.holeCards.length > 0 ? (
        <div className="hole-cards-row">
          {p.holeCards.map((c, i) => (
            <PixelCard
              key={c.id}
              card={c}
              revealed={showHoleCards}
              size="sm"
            />
          ))}
        </div>
      ) : null}

      {/* 玩家信息卡 */}
      <div className={cardClass}>
        <div className="flex items-center gap-1">
          {/* 盲注/庄家标识 */}
          {isDealer && <span className="dealer-btn" title="庄家">D</span>}
          {isSmallBlind && <span className="blind-tag" style={{ color: 'var(--neon-blue)' }}>SB</span>}
          {isBigBlind && <span className="blind-tag" style={{ color: 'var(--neon-red)' }}>BB</span>}
        </div>

        <span className="font-screen text-[11px] glow-cyan truncate max-w-[100px]">
          {p.username}
          {isMe && <span className="text-neon-green"> ★</span>}
        </span>
        <span className="font-mono text-lg text-neon-yellow leading-none">
          {p.chips}
        </span>

        {/* 当前轮下注 */}
        {p.betThisRound > 0 && (
          <span className="bet-chip">▲ {p.betThisRound}</span>
        )}

        {/* 动作标签 */}
        {p.lastAction && (
          <span className={'action-tag ' + (p.lastAction.type.replace(/-/g, ''))} style={{ color: actionColor(p.lastAction.type) }}>
            {ACTION_LABEL[p.lastAction.type]}
            {p.lastAction.amount ? ' ' + p.lastAction.amount : ''}
          </span>
        )}

        {/* 状态标记 */}
        {p.hasFolded && <span className="font-screen text-[9px] text-neon-red">弃牌</span>}
        {p.isAllIn && <span className="font-screen text-[9px] text-neon-pink blink">ALL IN</span>}
        {isActive && <span className="font-screen text-[9px] text-neon-yellow blink">▶ 行动中</span>}
      </div>
    </div>
  );
}

function actionColor(type: ActionType): string {
  switch (type) {
    case 'fold': return 'var(--neon-red)';
    case 'check': return 'var(--neon-cyan)';
    case 'call': return 'var(--neon-cyan)';
    case 'raise': return 'var(--neon-green)';
    case 'all-in': return 'var(--neon-pink)';
  }
}

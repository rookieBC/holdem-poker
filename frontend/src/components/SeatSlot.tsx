import { PixelCard } from './PixelCard';
import type { Seat, PublicPlayer, ActionType } from '@holdem/shared';
import { GameStage } from '@holdem/shared';

interface SeatSlotProps {
  seat: Seat;
  myPlayerId: string;
  stage: GameStage;
  isActive: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  /** 自己的座位：底牌用大尺寸，放在信息卡正上方 */
  isMySeat?: boolean;
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
  isMySeat = false,
}: SeatSlotProps) {
  const p = seat.player;

  if (!p) {
    return (
      <div className="player-card seat-empty-table">
        <span className="font-mono text-sm text-gray-600">空座</span>
      </div>
    );
  }

  const isMe = p.id === myPlayerId;
  const isShowdown = stage === GameStage.Showdown || stage === GameStage.Settled;
  const showHoleCards = isMe || (isShowdown && !p.hasFolded);

  const cardClass =
    'player-card ' +
    (isActive ? 'is-active ' : '') +
    (p.hasFolded ? 'is-folded ' : '') +
    (p.isAllIn ? 'is-allin ' : '');

  // 自己的底牌用大尺寸(md)，对手用小尺寸(sm)
  const holeCardSize = isMySeat ? 'md' : 'sm';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 底牌：在信息卡正上方，自己用大尺寸 */}
      {showHoleCards && p.holeCards && p.holeCards.length > 0 ? (
        <div className="hole-cards-row">
          {p.holeCards.map((c) => (
            <PixelCard key={c.id} card={c} revealed={showHoleCards} size={holeCardSize} />
          ))}
        </div>
      ) : null}

      {/* 玩家信息卡 */}
      <div className={cardClass}>
        <div className="flex items-center gap-1">
          {isDealer && <span className="dealer-btn" title="庄家">庄</span>}
          {isSmallBlind && <span className="blind-tag" style={{ color: 'var(--neon-blue)' }}>小盲</span>}
          {isBigBlind && <span className="blind-tag" style={{ color: 'var(--neon-red)' }}>大盲</span>}
        </div>

        <span className="font-screen text-[11px] glow-cyan truncate max-w-[100px]">
          {p.username}
          {isMe && <span className="text-neon-green"> ★</span>}
        </span>
        <span className="font-mono text-lg text-neon-yellow leading-none">
          {p.chips}
        </span>

        {p.betThisRound > 0 && (
          <span className="bet-chip">▲ {p.betThisRound}</span>
        )}

        {p.lastAction && (
          <span className="action-tag" style={{ color: actionColor(p.lastAction.type) }}>
            {ACTION_LABEL[p.lastAction.type]}
            {p.lastAction.amount ? ' ' + p.lastAction.amount : ''}
          </span>
        )}

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

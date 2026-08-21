import { motion } from 'framer-motion';
import { PixelCard } from './PixelCard';
import { AnimateNumber } from './AnimateNumber';
import { ActionTimer } from './ActionTimer';
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
  isMySeat?: boolean;
  isWinner?: boolean;
  winAmount?: number;
  actionDeadline?: number | null;
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
  isWinner = false,
  winAmount,
  actionDeadline,
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
  // 摊牌且有 bestFive 时，展示最优5张牌而非原始底牌
  const showBestFive = isShowdown && !p.hasFolded && p.bestFive && p.bestFive.length === 5;

  const cardClass =
    'player-card ' +
    (isActive ? 'is-active ' : '') +
    (p.hasFolded ? 'is-folded ' : '') +
    (p.isAllIn ? 'is-allin ' : '') +
    (isWinner ? 'is-winner ' : '');

  const holeCardSize = isMySeat ? 'md' : 'sm';

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 摊牌时：展示最优5张牌（bestFive） */}
      {showBestFive ? (
        /* 所有玩家统一上三下二排版，自己用md大尺寸，对手用sm小尺寸 */
        <div className="best-five-my">
          <div className="best-five-row">
            {p.bestFive!.slice(0, 3).map((c, i) => (
              <PixelCard key={'top-' + i} card={c} revealed size={isMySeat ? 'md' : 'sm'} highlight={isWinner} />
            ))}
          </div>
          <div className="best-five-row">
            {p.bestFive!.slice(3, 5).map((c, i) => (
              <PixelCard key={'bot-' + i} card={c} revealed size={isMySeat ? 'md' : 'sm'} highlight={isWinner} />
            ))}
          </div>
        </div>
      ) : (
        /* 非摊牌：正常显示底牌 */
        showHoleCards && p.holeCards && p.holeCards.length > 0 ? (
          <div className="hole-cards-row">
            {p.holeCards.map((c) => (
              <PixelCard key={c.id} card={c} revealed={showHoleCards} size={holeCardSize} />
            ))}
          </div>
        ) : null
      )}

      {/* 牌型名 */}
      {isShowdown && !p.hasFolded && p.handName && (
        <span className={isMySeat ? 'hand-name-lg font-screen glow-yellow' : 'hand-name font-screen text-[9px] glow-yellow'}>
          {p.handName}
        </span>
      )}

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

        {isWinner ? (
          <>
            <AnimateNumber value={p.chips} fontSize={18} bumpScale={1.6} className="font-mono text-neon-yellow leading-none" />
            <motion.span
              className="font-screen text-[10px] win-tag"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              WIN +{winAmount}
            </motion.span>
          </>
        ) : (
          <span className="font-mono text-lg text-neon-yellow leading-none">
            {p.chips}
          </span>
        )}

        {p.isAllIn ? (
          <span className="font-screen text-[9px] text-neon-pink blink">梭哈 {p.totalCommitted}</span>
        ) : (
          <>
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
            {isActive && actionDeadline && (
              <ActionTimer deadline={actionDeadline} size={44} />
            )}
          </>
        )}
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

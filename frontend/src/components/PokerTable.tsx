import { CommunityArea } from './CommunityArea';
import { SeatSlot } from './SeatSlot';
import type { GameState } from '@holdem/shared';

interface PokerTableProps {
  state: GameState;
  myPlayerId: string;
}

/**
 * 牌桌布局（以我为中心）：
 * 自己的座位(含大底牌)在底部中央，其他玩家围绕。
 * 公共牌+底池在牌桌中上部。
 * 底牌随座位走(在信息卡正上方)，不再单独绝对定位。
 */

// 6座：底部用 bottom 定位(从底边算)，其他用 top
const POS_6 = [
  { bottom: '2%', left: '50%' },   // 0 自己(底部,含底牌整体)
  { bottom: '8%', left: '8%' },    // 1 左下
  { top: '38%', left: '4%' },     // 2 左上
  { top: '4%', left: '50%' },     // 3 顶部
  { top: '38%', left: '96%' },    // 4 右上
  { bottom: '8%', left: '92%' },   // 5 右下
];

const POS_9 = [
  { bottom: '2%', left: '50%' },   // 0 自己
  { bottom: '8%', left: '12%' },   // 1 左下
  { top: '44%', left: '3%' },     // 2 左侧
  { top: '8%', left: '14%' },     // 3 顶部偏左
  { top: '3%', left: '50%' },     // 4 顶部中央
  { top: '8%', left: '86%' },     // 5 顶部偏右
  { top: '44%', left: '97%' },    // 6 右侧
  { bottom: '8%', left: '88%' },   // 7 右下
  { bottom: '8%', left: '70%' },   // 8 备用
];

export function PokerTable({ state, myPlayerId }: PokerTableProps) {
  const totalSeats = state.seats.length;
  const positions = totalSeats >= 9 ? POS_9 : POS_6;

  let mySeatIndex = state.seats.findIndex((s) => s.player?.id === myPlayerId);
  if (mySeatIndex < 0) mySeatIndex = 0;

  const getDisplayPos = (realSeatIndex: number): number =>
    (realSeatIndex - mySeatIndex + totalSeats) % totalSeats;

  const renderedSeats = state.seats
    .map((seat, realIndex) => ({ seat, realIndex, displayPos: getDisplayPos(realIndex) }))
    .sort((a, b) => a.displayPos - b.displayPos);

  return (
    <div className="poker-table">
      {/* 座位环排 */}
      {renderedSeats.map(({ seat, realIndex, displayPos }) => {
        const pos = positions[displayPos] ?? positions[0];
        const isMe = seat.player?.id === myPlayerId;
        // bottom 定位的用 translate(-50%, 0)从底部对齐，top 定位的用 translate(-50%, -50%)居中
        const useBottom = 'bottom' in pos;
        const style: React.CSSProperties = useBottom
          ? { bottom: pos.bottom, left: pos.left, transform: 'translate(-50%, 0)' }
          : { top: (pos as { top: string }).top, left: pos.left, transform: 'translate(-50%, -50%)' };
        const winnerInfo = state.winners?.find((w) => w.playerId === seat.player?.id);
        return (
          <div key={realIndex} className="seat-slot" style={style}>
            <SeatSlot
              seat={seat}
              myPlayerId={myPlayerId}
              stage={state.stage}
              isActive={realIndex === state.currentPlayerIndex}
              isDealer={realIndex === state.dealerIndex}
              isSmallBlind={realIndex === state.smallBlindIndex}
              isBigBlind={realIndex === state.bigBlindIndex}
              isMySeat={isMe}
              isWinner={!!winnerInfo}
              winAmount={winnerInfo?.amount}
            />
          </div>
        );
      })}

      {/* 公共牌 + 底池（中上部） */}
      <div className="table-content-top">
        <CommunityArea state={state} />
      </div>
    </div>
  );
}

import { CommunityArea } from './CommunityArea';
import { SeatSlot } from './SeatSlot';
import { PixelCard } from './PixelCard';
import type { GameState } from '@holdem/shared';
import { GameStage } from '@holdem/shared';

interface PokerTableProps {
  state: GameState;
  myPlayerId: string;
}

/**
 * 牌桌布局（以我为中心）：
 *   公共牌 + 底池 在上半部（top:40%）
 *   我的底牌 在下半部（top:72%，座位正上方）
 *   我的座位 在最底部（top:92%）
 * 互不重叠。
 */

const POS_6 = [
  { top: '92%', left: '50%' },   // 0 自己（最底部）
  { top: '80%', left: '8%' },    // 1 左下
  { top: '40%', left: '4%' },    // 2 左上
  { top: '5%', left: '50%' },    // 3 顶部
  { top: '40%', left: '96%' },   // 4 右上
  { top: '80%', left: '92%' },   // 5 右下
];

const POS_9 = [
  { top: '92%', left: '50%' },   // 0 自己
  { top: '78%', left: '12%' },   // 1 左下
  { top: '46%', left: '3%' },    // 2 左侧
  { top: '10%', left: '14%' },   // 3 顶部偏左
  { top: '4%', left: '50%' },    // 4 顶部中央
  { top: '10%', left: '86%' },   // 5 顶部偏右
  { top: '46%', left: '97%' },   // 6 右侧
  { top: '78%', left: '88%' },   // 7 右下
  { top: '78%', left: '70%' },   // 8 备用
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

  const mySeat = state.seats[mySeatIndex];
  const myPlayer = mySeat?.player;
  const myHoleCards = myPlayer?.holeCards;

  return (
    <div className="poker-table">
      {/* 座位环排 */}
      {renderedSeats.map(({ seat, realIndex, displayPos }) => {
        const pos = positions[displayPos] ?? positions[0];
        const isMe = seat.player?.id === myPlayerId;
        return (
          <div
            key={realIndex}
            className="seat-slot"
            style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
          >
            <SeatSlot
              seat={seat}
              myPlayerId={myPlayerId}
              stage={state.stage}
              isActive={realIndex === state.currentPlayerIndex}
              isDealer={realIndex === state.dealerIndex}
              isSmallBlind={realIndex === state.smallBlindIndex}
              isBigBlind={realIndex === state.bigBlindIndex}
              hideHoleCards={isMe}
            />
          </div>
        );
      })}

      {/* 公共牌 + 底池（上半部） */}
      <div className="table-content-top">
        <CommunityArea state={state} />
      </div>

      {/* 我的大底牌（下半部，座位正上方） */}
      {myHoleCards && myHoleCards.length > 0 && (
        <div className="my-hole-cards-zone">
          <span className="font-screen text-[9px] glow-green mb-1">▼ 我的底牌</span>
          <div className="flex gap-3 justify-center">
            {myHoleCards.map((c) => (
              <PixelCard key={c.id} card={c} revealed size="md" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

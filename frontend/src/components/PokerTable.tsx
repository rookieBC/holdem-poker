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
 * 牌桌布局（以我为中心的视角）：
 *
 *   ┌─────────────────────────┐
 *   │  座位3(顶)               │  ← 上区：其他玩家
 *   │  座位2  公共牌  座位4     │  ← 中上区：公共牌区
 *   │  座位1  底池    座位5     │  ← 中区：底池
 *   │  座位1  我的底牌  座位5   │  ← 中下区：我的大底牌
 *   │        座位0(我)         │  ← 下区：我的座位
 *   └─────────────────────────┘
 *
 * 绝对定位的座位 + flex 中央内容区，三区不重叠。
 */

// 6座布局：显示位置 -> {top, left}，位置0=自己(底部中央)
const POS_6 = [
  { top: '90%', left: '50%' },   // 0 自己（最底部中央）
  { top: '78%', left: '10%' },   // 1 左下
  { top: '38%', left: '4%' },    // 2 左上
  { top: '6%', left: '50%' },    // 3 顶部中央
  { top: '38%', left: '96%' },   // 4 右上
  { top: '78%', left: '90%' },   // 5 右下
];

const POS_9 = [
  { top: '90%', left: '50%' },   // 0 自己
  { top: '76%', left: '14%' },   // 1 左下
  { top: '44%', left: '3%' },    // 2 左侧
  { top: '10%', left: '16%' },   // 3 顶部偏左
  { top: '4%', left: '50%' },    // 4 顶部中央
  { top: '10%', left: '84%' },   // 5 顶部偏右
  { top: '44%', left: '97%' },   // 6 右侧
  { top: '76%', left: '86%' },   // 7 右下
  { top: '76%', left: '70%' },   // 8 备用
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

  // 我的底牌
  const mySeat = state.seats[mySeatIndex];
  const myPlayer = mySeat?.player;
  const myHoleCards = myPlayer?.holeCards;
  const isShowdown = state.stage === GameStage.Showdown || state.stage === GameStage.Settled;

  return (
    <div className="poker-table">
      {/* 座位环排（绝对定位，以我为中心） */}
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

      {/* 中央内容区：公共牌(上) + 底池(中) + 我的底牌(下) */}
      <div className="table-content">
        {/* 上区：公共牌 */}
        <CommunityArea state={state} />

        {/* 下区：我的大底牌 */}
        {myHoleCards && myHoleCards.length > 0 && (
          <div className="my-hole-cards">
            <span className="font-screen text-[9px] glow-green">▼ 我的底牌</span>
            <div className="flex gap-3 justify-center">
              {myHoleCards.map((c) => (
                <PixelCard key={c.id} card={c} revealed size="md" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

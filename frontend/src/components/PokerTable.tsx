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
 * 视角旋转：让"我"始终在正下方（底部中央），其他玩家围绕排列。
 * 显示位置 0 = 自己（底部中央），其余按顺时针围绕。
 */
const POS_6 = [
  { top: '85%', left: '50%' },   // 0 自己（底部中央）
  { top: '80%', left: '12%' },   // 1 左下
  { top: '42%', left: '5%' },    // 2 左上
  { top: '10%', left: '50%' },   // 3 顶部中央
  { top: '42%', left: '95%' },   // 4 右上
  { top: '80%', left: '88%' },   // 5 右下
];

const POS_9 = [
  { top: '85%', left: '50%' },   // 0 自己
  { top: '78%', left: '16%' },   // 1 左下
  { top: '48%', left: '4%' },    // 2 左侧
  { top: '12%', left: '18%' },   // 3 顶部偏左
  { top: '6%', left: '50%' },    // 4 顶部中央
  { top: '12%', left: '82%' },   // 5 顶部偏右
  { top: '48%', left: '96%' },   // 6 右侧
  { top: '78%', left: '84%' },   // 7 右下
  { top: '78%', left: '68%' },   // 8 备用
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

  // 我的底牌（单独大底牌区，不在座位上显示）
  const mySeat = state.seats[mySeatIndex];
  const myPlayer = mySeat?.player;
  const myHoleCards = myPlayer?.holeCards;
  const isShowdown = state.stage === GameStage.Showdown || state.stage === GameStage.Settled;

  return (
    <div className="poker-table">
      {/* 座位环排（以我为中心） */}
      {renderedSeats.map(({ seat, realIndex, displayPos }) => {
        const pos = positions[displayPos] ?? positions[0];
        // 自己的座位不显示小底牌（用单独大底牌区）
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

      {/* 中央：公共牌 + 底池 + 我的大底牌 */}
      <div className="table-center">
        {/* 公共牌 + 底池 */}
        <CommunityArea state={state} />

        {/* 我的大底牌（公共牌下方） */}
        {myHoleCards && myHoleCards.length > 0 && (
          <div className="my-hole-cards">
            {isShowdown && <span className="font-screen text-[10px] glow-green mb-1">我的底牌</span>}
            <div className="flex gap-3 justify-center">
              {myHoleCards.map((c) => (
                <PixelCard key={c.id} card={c} revealed size="lg" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

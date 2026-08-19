import { CommunityArea } from './CommunityArea';
import { SeatSlot } from './SeatSlot';
import type { GameState, Seat } from '@holdem/shared';

interface PokerTableProps {
  state: GameState;
  myPlayerId: string;
}

// 6 座环排定位（百分比，相对牌桌容器）
// 座位0: 底部左, 1: 底部右, 2: 右侧, 3: 顶部, 4: 左侧上, 5: 左侧下
const SEAT_POSITIONS: { top: string; left: string; transform: string }[] = [
  { top: '82%', left: '28%', transform: 'translate(-50%, -50%)' }, // 0 底左
  { top: '82%', left: '72%', transform: 'translate(-50%, -50%)' }, // 1 底右
  { top: '55%', left: '92%', transform: 'translate(-50%, -50%)' }, // 2 右
  { top: '12%', left: '50%', transform: 'translate(-50%, -50%)' }, // 3 顶
  { top: '40%', left: '6%', transform: 'translate(-50%, -50%)' },  // 4 左上
  { top: '75%', left: '6%', transform: 'translate(-50%, -50%)' },  // 5 左下
];

export function PokerTable({ state, myPlayerId }: PokerTableProps) {
  return (
    <div className="poker-table">
      {/* 座位环排 */}
      {state.seats.map((seat, i) => {
        const pos = SEAT_POSITIONS[i] ?? SEAT_POSITIONS[0];
        return (
          <div
            key={i}
            className="seat-slot"
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.transform,
            }}
          >
            <SeatSlot
              seat={seat}
              myPlayerId={myPlayerId}
              stage={state.stage}
              isActive={i === state.currentPlayerIndex}
              isDealer={i === state.dealerIndex}
              isSmallBlind={i === state.smallBlindIndex}
              isBigBlind={i === state.bigBlindIndex}
            />
          </div>
        );
      })}

      {/* 中央公共牌 + 底池 */}
      <CommunityArea state={state} />
    </div>
  );
}

import { useMemo } from 'react';
import { PixelCard } from './PixelCard';
import { AnimateNumber } from './AnimateNumber';
import { evaluateHand } from '@holdem/shared';
import type { GameState } from '@holdem/shared';
import { GameStage } from '@holdem/shared';

interface CommunityAreaProps {
  state: GameState;
  myPlayerId?: string;
}

const STAGE_LABEL: Record<GameStage, string> = {
  [GameStage.Waiting]: '等待',
  [GameStage.Ready]: '准备',
  [GameStage.PreFlop]: '翻牌前',
  [GameStage.Flop]: '翻牌',
  [GameStage.Turn]: '转牌',
  [GameStage.River]: '河牌',
  [GameStage.Showdown]: '摊牌',
  [GameStage.Settled]: '已结算',
};

const STAGE_COLOR: Record<GameStage, string> = {
  [GameStage.Waiting]: '#888',
  [GameStage.Ready]: '#888',
  [GameStage.PreFlop]: '#00f0ff',
  [GameStage.Flop]: '#39ff14',
  [GameStage.Turn]: '#ffe600',
  [GameStage.River]: '#ff8800',
  [GameStage.Showdown]: '#ff2d75',
  [GameStage.Settled]: '#b026ff',
};

export function CommunityArea({ state, myPlayerId }: CommunityAreaProps) {
  const cards = state.communityCards;
  const stageColor = STAGE_COLOR[state.stage];
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);
  const isShowdown = state.stage === GameStage.Showdown || state.stage === GameStage.Settled;

  // 实时牌型辅助提示
  const handHint = useMemo(() => {
    if (!myPlayerId) return null;
    const mySeat = state.seats.find((s) => s.player?.id === myPlayerId);
    const myPlayer = mySeat?.player;
    if (!myPlayer || !myPlayer.holeCards || myPlayer.holeCards.length < 2) return null;
    if (isShowdown) return myPlayer.handName ?? null;
    const allCards = [...myPlayer.holeCards, ...state.communityCards];
    if (allCards.length < 2) return null;
    return evaluateHand(allCards).name;
  }, [state, myPlayerId, isShowdown]);

  return (
    <div className="community-area">
      {/* 阶段指示 + 底池（同一行） */}
      <div className="community-header">
        <div
          className="stage-indicator"
          style={{ color: stageColor, borderColor: stageColor }}
        >
          {STAGE_LABEL[state.stage]}
          {state.handNumber > 0 && <span className="ml-2 opacity-60">#{state.handNumber}</span>}
        </div>

        <div className="pot-display">
          <span className="font-screen text-xs glow-yellow">POT</span>
          <AnimateNumber
            value={state.currentPot}
            fontSize={24}
            bumpScale={1.5}
            className="font-mono glow-yellow leading-none"
          />
        </div>

        {!isShowdown && state.currentBet > 0 && (
          <span className="font-screen text-[10px] text-neon-cyan">
            当前注 {state.currentBet}
          </span>
        )}
      </div>

      {/* 实时牌型提示（仅非结算阶段） */}
      {handHint && !isShowdown && (
        <div className="hand-hint font-screen text-[10px] glow-cyan">
          你的牌型: {handHint}
        </div>
      )}

      {/* 公共牌（结算时隐藏，结算信息由座位上的 bestFive 展示） */}
      {!isShowdown && (
        <div className="flex gap-2 items-center justify-center flex-wrap">
          {slots.map((c, i) =>
            c ? (
              <PixelCard key={c.id} card={c} revealed size="md" />
            ) : (
              <div
                key={i}
                className="border-2 border-dashed border-neon-cyan/20 rounded-sm"
                style={{ width: 80, height: 114, opacity: 0.3 }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

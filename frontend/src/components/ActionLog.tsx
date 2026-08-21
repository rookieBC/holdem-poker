import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game';
import type { GameState, ActionType } from '@holdem/shared';

interface ActionLogProps {
  state: GameState;
}

interface LogEntry {
  id: string;
  text: string;
  color: string;
}

const ACTION_TEXT: Record<string, string> = {
  fold: '弃牌',
  check: '过牌',
  call: '跟注',
  raise: '加注',
  'all-in': '梭哈',
};

const ACTION_COLOR: Record<string, string> = {
  fold: 'var(--neon-red)',
  check: 'var(--neon-cyan)',
  call: 'var(--neon-cyan)',
  raise: 'var(--neon-green)',
  'all-in': 'var(--neon-pink)',
};

let entryId = 0;

/**
 * 操作历史栏：消费 gameEvent，累积显示玩家操作记录。
 * 用 lastEvent 去重，避免 state 变化导致重复处理。
 */
export function ActionLog({ state }: ActionLogProps) {
  const lastEvent = useGameStore((s) => s.lastEvent);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastProcessedId = useRef<string | null>(null);

  useEffect(() => {
    if (!lastEvent) return;
    // 用事件内容生成唯一 ID 去重，避免 state 变化导致重复处理
    const eventId = JSON.stringify(lastEvent);
    if (eventId === lastProcessedId.current) return;
    lastProcessedId.current = eventId;

    const ev = lastEvent as { type: string; data: Record<string, unknown> };
    let entry: LogEntry | null = null;

    if (ev.type === 'bet' || ev.type === 'fold') {
      const playerId = ev.data.playerId as string;
      const action = ev.data.action as { type: ActionType; amount?: number } | undefined;
      const timeout = ev.data.timeout as boolean | undefined;
      if (!action) return;
      const player = state.seats.find((s) => s.player?.id === playerId)?.player;
      const name = player?.username ?? '???';
      const actText = ACTION_TEXT[action.type] ?? action.type;
      const amtText = action.amount ? ` ${action.amount}` : '';
      const timeoutText = timeout ? ' (超时)' : '';
      entry = {
        id: `e${entryId++}`,
        text: `${name} ${actText}${amtText}${timeoutText}`,
        color: ACTION_COLOR[action.type] ?? 'var(--neon-cyan)',
      };
    } else if (ev.type === 'deal-hole') {
      entry = { id: `e${entryId++}`, text: '🎴 发底牌', color: 'var(--neon-cyan)' };
    } else if (ev.type === 'deal-community') {
      const stage = ev.data.stage as string;
      const label = stage === 'flop' ? '翻牌' : stage === 'turn' ? '转牌' : '河牌';
      entry = { id: `e${entryId++}`, text: `🎴 ${label}`, color: 'var(--neon-green)' };
    } else if (ev.type === 'showdown') {
      entry = { id: `e${entryId++}`, text: '👁 摊牌', color: 'var(--neon-pink)' };
    } else if (ev.type === 'win') {
      entry = { id: `e${entryId++}`, text: '🏆 本局结算', color: 'var(--neon-yellow)' };
    }

    if (entry) {
      setLogs((prev) => [...prev.slice(-19), entry]);
    }
  }, [lastEvent, state]);

  // 新一局开始时清空
  useEffect(() => {
    if (lastEvent?.type === 'deal-hole') {
      setLogs([]);
    }
  }, [lastEvent]);

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="action-log">
      <div className="action-log-title font-screen text-[10px] text-gray-500">操作记录</div>
      <div ref={containerRef} className="action-log-list">
        {logs.length === 0 ? (
          <div className="font-mono text-xs text-gray-600 text-center py-2">等待开局...</div>
        ) : (
          logs.map((e) => (
            <div key={e.id} className="action-log-entry font-mono text-xs" style={{ color: e.color }}>
              {e.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

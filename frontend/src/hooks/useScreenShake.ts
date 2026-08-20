import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/game';

/**
 * 震屏强度分级
 * - medium: 加注（明显震感）
 * - heavy: All-in、摊牌、胜利揭晓（强烈震屏）
 *
 * 设计原则：震屏是"冲击力"工具，只在真正有戏剧张力的瞬间使用。
 * 常规操作（call/check/翻牌/弃牌/发牌）不震屏，避免麻木。
 */
type ShakeIntensity = 'medium' | 'heavy';

interface ShakeConfig {
  intensity: ShakeIntensity;
  durationMs: number;
}

/** 根据事件类型 + 动作数据判定震屏强度，常规操作返回 null（不震） */
function resolveShake(event: { type: string; data: Record<string, unknown> }): ShakeConfig | null {
  const action = event.data?.action as { type?: string; amount?: number } | undefined;

  switch (event.type) {
    case 'bet':
      // All-in → heavy
      if (action?.type === 'all-in') return { intensity: 'heavy', durationMs: 600 };
      // raise → medium，大额 raise 升级为 heavy
      if (action?.type === 'raise') {
        const amt = action.amount ?? 0;
        return { intensity: amt >= 500 ? 'heavy' : 'medium', durationMs: 450 };
      }
      // call/check 不震屏
      return null;

    case 'fold':
    case 'deal-hole':
    case 'deal-community':
      return null; // 常规操作不震屏

    case 'showdown':
      return { intensity: 'heavy', durationMs: 800 };

    case 'win':
      return { intensity: 'heavy', durationMs: 1000 };

    default:
      return null;
  }
}

const INTENSITY_CLASS: Record<ShakeIntensity, string> = {
  medium: 'shake-medium',
  heavy: 'shake-heavy',
};

/**
 * 震屏 hook：监听 game store 的 lastEvent，按事件分级给目标元素触发震屏动画。
 * 返回一个 ref 绑定到需要震动的容器（通常是牌桌）。
 */
export function useScreenShake() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const lastEvent = useGameStore((s) => s.lastEvent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastEvent) return;
    const cfg = resolveShake(lastEvent);
    if (!cfg) return;

    const el = targetRef.current;
    if (!el) return;

    // 清除上一次未结束的震动
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      el.classList.remove('shake-medium', 'shake-heavy');
    }

    const cls = INTENSITY_CLASS[cfg.intensity];
    el.classList.add(cls);
    timerRef.current = setTimeout(() => {
      el.classList.remove(cls);
      timerRef.current = null;
    }, cfg.durationMs);
  }, [lastEvent]);

  return targetRef;
}

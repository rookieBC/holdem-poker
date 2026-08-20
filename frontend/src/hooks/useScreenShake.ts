import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/game';

/**
 * 震屏强度分级
 * - light: 翻牌、普通下注（轻微晃动）
 * - medium: 大额加注（明显震感）
 * - heavy: All-in、胜负揭晓（强烈震屏）
 */
type ShakeIntensity = 'light' | 'medium' | 'heavy';

interface ShakeConfig {
  intensity: ShakeIntensity;
  durationMs: number;
}

/** 根据事件类型 + 动作数据判定震屏强度 */
function resolveShake(event: { type: string; data: Record<string, unknown> }): ShakeConfig | null {
  const action = event.data?.action as { type?: string; amount?: number } | undefined;

  switch (event.type) {
    case 'bet':
      // All-in → heavy
      if (action?.type === 'all-in') return { intensity: 'heavy', durationMs: 600 };
      // raise → medium，大额 raise 更强
      if (action?.type === 'raise') {
        const amt = action.amount ?? 0;
        return { intensity: amt >= 500 ? 'heavy' : 'medium', durationMs: 450 };
      }
      // call/check → light
      return { intensity: 'light', durationMs: 250 };

    case 'fold':
      return null; // 弃牌不震屏，用其他动效

    case 'deal-hole':
      return null; // 发底牌不震屏

    case 'deal-community':
      return { intensity: 'light', durationMs: 350 };

    case 'showdown':
      return { intensity: 'heavy', durationMs: 800 };

    case 'win':
      return { intensity: 'heavy', durationMs: 1000 };

    default:
      return null;
  }
}

const INTENSITY_CLASS: Record<ShakeIntensity, string> = {
  light: 'shake-light',
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
      el.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
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

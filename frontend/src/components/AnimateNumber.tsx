import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface AnimateNumberProps {
  value: number;
  /** 跳动放大倍数（变化时短暂放大） */
  bumpScale?: number;
  /** 字体大小（px），用于放大基准 */
  fontSize?: number;
  /** 额外 className */
  className?: string;
  /** 数字滚动时长（秒） */
  duration?: number;
}

/**
 * 数字跳动组件：值变化时先放大 + 数字滚动到新值，再弹性回落。
 * 用于底池、筹码等需要"爽感"的数字。
 */
export function AnimateNumber({
  value,
  bumpScale = 1.4,
  fontSize = 24,
  className = '',
  duration = 0.4,
}: AnimateNumberProps) {
  const display = useMotionValue(0);
  const [rounded, setRounded] = useState(value);
  const [bumping, setBumping] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return; // 无变化不跳动

    // 数字滚动
    const controls = animate(display, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setRounded(Math.round(v)),
    });

    // 放大跳动
    setBumping(true);
    const bumpTimer = setTimeout(() => setBumping(false), duration * 1000 + 120);

    prevRef.current = value;
    return () => {
      controls.stop();
      clearTimeout(bumpTimer);
    };
  }, [value, display, duration]);

  return (
    <motion.span
      className={className}
      animate={{
        scale: bumping ? bumpScale : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 12,
      }}
      style={{ display: 'inline-block', fontSize }}
    >
      {rounded.toLocaleString()}
    </motion.span>
  );
}

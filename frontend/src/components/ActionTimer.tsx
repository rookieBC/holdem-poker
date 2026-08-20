import { useEffect, useState } from 'react';

interface ActionTimerProps {
  /** 截止时间戳 (ms) */
  deadline: number;
  /** 总时长 (ms)，用于计算进度 */
  totalMs?: number;
  /** 尺寸 */
  size?: number;
}

/**
 * 环形倒计时：显示在当前行动玩家的座位上。
 * 剩余时间 < 5秒时变红闪烁。
 */
export function ActionTimer({ deadline, totalMs = 30000, size = 48 }: ActionTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const update = () => {
      const r = Math.max(0, deadline - Date.now());
      setRemaining(r);
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [deadline]);

  const seconds = Math.ceil(remaining / 1000);
  const progress = remaining / totalMs; // 1 → 0
  const isUrgent = remaining < 5000;

  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={isUrgent ? 'action-timer action-timer-urgent' : 'action-timer'}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="action-timer-svg">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={3}
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? 'var(--neon-pink)' : 'var(--neon-yellow)'}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span className={`action-timer-text font-mono ${isUrgent ? 'text-neon-pink' : 'text-neon-yellow'}`}>
        {seconds}
      </span>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { Card } from '@holdem/shared';
import { SUIT_SYMBOL, isRedSuit } from '@holdem/shared';

interface PixelCardProps {
  card?: Card | null;
  revealed?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// 增大尺寸，确保牌面清晰可读
const SIZE_MAP = {
  sm: { w: 56, h: 80, fs: 13 },    // 座位旁底牌
  md: { w: 76, h: 108, fs: 16 },   // 公共牌
  lg: { w: 96, h: 136, fs: 20 },   // 大展示
};

export function PixelCard({ card, revealed = true, highlight = false, size = 'md' }: PixelCardProps) {
  const { w, h, fs } = SIZE_MAP[size];
  const colorClass = card && isRedSuit(card.suit) ? 'text-neon-red' : 'text-bg-deep';

  return (
    <motion.div
      style={{ width: w, height: h }}
      className={`relative select-none shrink-0 ${highlight ? 'z-10' : ''}`}
      whileHover={highlight ? { scale: 1.08, y: -6 } : undefined}
      animate={highlight ? { scale: [1, 1.06, 1] } : undefined}
      transition={highlight ? { duration: 0.6, repeat: Infinity } : undefined}
    >
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: revealed ? 0 : 180 }}
        transition={{ duration: 0.5 }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 flex flex-col justify-between"
          style={{
            backfaceVisibility: 'hidden',
            background: '#f0f0e8',
            border: '2px solid #0a0a18',
            borderRadius: 4,
            boxShadow: highlight
              ? `0 0 12px var(--neon-yellow), 0 0 24px var(--neon-yellow)`
              : '2px 2px 0 #0a0a18',
            padding: 3,
          }}
        >
          {card && (
            <>
              {/* 左上角：点数 + 花色（竖排紧凑） */}
              <div className={`flex flex-col items-center leading-none ${colorClass}`} style={{ fontSize: fs }}>
                <span className="font-screen font-bold">{card.rank}</span>
                <span style={{ fontSize: fs * 0.85, lineHeight: 1 }}>{SUIT_SYMBOL[card.suit]}</span>
              </div>

              {/* 中央大花色 */}
              <div className={`flex-1 flex items-center justify-center ${colorClass}`}>
                <span className="font-screen" style={{ fontSize: fs * 2.2, lineHeight: 1 }}>
                  {SUIT_SYMBOL[card.suit]}
                </span>
              </div>

              {/* 右下角：点数 + 花色（旋转180°，竖排紧凑） */}
              <div className={`flex flex-col items-center leading-none rotate-180 ${colorClass}`} style={{ fontSize: fs }}>
                <span className="font-screen font-bold">{card.rank}</span>
                <span style={{ fontSize: fs * 0.85, lineHeight: 1 }}>{SUIT_SYMBOL[card.suit]}</span>
              </div>
            </>
          )}
        </div>

        {/* 背面 */}
        <div
          className="card-back absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 4,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import type { Card } from '@holdem/shared';
import { SUIT_SYMBOL, isRedSuit } from '@holdem/shared';

interface PixelCardProps {
  card?: Card | null; // null/undefined = 牌背
  revealed?: boolean;
  highlight?: boolean; // 关键牌高亮
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { w: 48, h: 68, fs: 14 },
  md: { w: 64, h: 92, fs: 18 },
  lg: { w: 84, h: 120, fs: 24 },
};

export function PixelCard({ card, revealed = true, highlight = false, size = 'md' }: PixelCardProps) {
  const { w, h, fs } = SIZE_MAP[size];
  const isBack = !card || !revealed;

  return (
    <motion.div
      style={{ width: w, height: h, fontSize: fs }}
      className={`relative select-none ${
        highlight ? 'z-10' : ''
      }`}
      whileHover={highlight ? { scale: 1.08, y: -6 } : undefined}
      animate={highlight ? { scale: [1, 1.06, 1] } : undefined}
      transition={highlight ? { duration: 0.6, repeat: Infinity } : undefined}
    >
      {/* 翻牌效果 */}
      <motion.div
        className="w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: revealed ? 0 : 180 }}
        transition={{ duration: 0.5 }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-1"
          style={{
            backfaceVisibility: 'hidden',
            background: '#f0f0e8',
            border: '2px solid #0a0a18',
            boxShadow: highlight
              ? `0 0 12px var(--neon-yellow), 0 0 24px var(--neon-yellow)`
              : '2px 2px 0 #0a0a18',
          }}
        >
          {card && (
            <>
              <div className={`font-screen font-bold leading-none ${isRedSuit(card.suit) ? 'text-neon-red' : 'text-bg-deep'}`}>
                <div>{card.rank}</div>
                <div style={{ fontSize: fs * 0.8 }}>{SUIT_SYMBOL[card.suit]}</div>
              </div>
              <div className={`text-center font-screen ${isRedSuit(card.suit) ? 'text-neon-red' : 'text-bg-deep'}`} style={{ fontSize: fs * 1.4 }}>
                {SUIT_SYMBOL[card.suit]}
              </div>
              <div className={`text-right font-screen font-bold leading-none rotate-180 ${isRedSuit(card.suit) ? 'text-neon-red' : 'text-bg-deep'}`}>
                <div>{card.rank}</div>
                <div style={{ fontSize: fs * 0.8 }}>{SUIT_SYMBOL[card.suit]}</div>
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
          }}
        />
      </motion.div>
    </motion.div>
  );
}

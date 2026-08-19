import { motion } from 'framer-motion';
import type { Card } from '@holdem/shared';
import { SUIT_SYMBOL, isRedSuit } from '@holdem/shared';

interface PixelCardProps {
  card?: Card | null;
  revealed?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// 像素风卡牌：大尺寸 + 高对比黑白底 + 粗体数字
const SIZE_MAP = {
  sm: { w: 64, h: 90, fs: 15 },    // 座位底牌
  md: { w: 80, h: 114, fs: 18 },   // 公共牌
  lg: { w: 100, h: 142, fs: 22 },  // 大展示
};

export function PixelCard({ card, revealed = true, highlight = false, size = 'md' }: PixelCardProps) {
  const { w, h, fs } = SIZE_MAP[size];

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
          className="absolute inset-0 flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            background: '#f8f8f0',
            border: '3px solid #0a0a18',
            borderRadius: 5,
            boxShadow: highlight
              ? `0 0 14px var(--neon-yellow), 0 0 28px var(--neon-yellow)`
              : '3px 3px 0 #0a0a18',
          }}
        >
          {card && <CardFace card={card} fs={fs} />}
        </div>

        {/* 背面 */}
        <div
          className="card-back absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 5,
            border: '3px solid var(--neon-cyan)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/** 卡牌正面：像素风大字布局 */
function CardFace({ card, fs }: { card: Card; fs: number }) {
  const isRed = isRedSuit(card.suit);
  const color = isRed ? '#cc0000' : '#0a0a18';
  const suit = SUIT_SYMBOL[card.suit];

  return (
    <>
      {/* 左上角：点数（大）+ 花色（小） */}
      <div className="flex flex-col items-center leading-none" style={{ color, padding: '4px 2px 0 4px' }}>
        <span style={{ fontSize: fs, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-1px' }}>
          {card.rank}
        </span>
        <span style={{ fontSize: fs * 0.7, lineHeight: 1.1 }}>{suit}</span>
      </div>

      {/* 中央大花色 */}
      <div className="flex-1 flex items-center justify-center" style={{ color }}>
        <span style={{ fontSize: fs * 2.4, lineHeight: 1, fontWeight: 900 }}>{suit}</span>
      </div>

      {/* 右下角：点数 + 花色（旋转） */}
      <div className="flex flex-col items-center leading-none rotate-180" style={{ color, padding: '0 4px 4px 2px' }}>
        <span style={{ fontSize: fs, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-1px' }}>
          {card.rank}
        </span>
        <span style={{ fontSize: fs * 0.7, lineHeight: 1.1 }}>{suit}</span>
      </div>
    </>
  );
}

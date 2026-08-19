import { motion } from 'framer-motion';
import type { Card } from '@holdem/shared';
import { SUIT_SYMBOL, isRedSuit } from '@holdem/shared';

interface PixelCardProps {
  card?: Card | null;
  revealed?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { w: 60, h: 84, fs: 14, corner: 4 },
  md: { w: 76, h: 106, fs: 17, corner: 5 },
  lg: { w: 92, h: 128, fs: 20, corner: 6 },
};

export function PixelCard({ card, revealed = true, highlight = false, size = 'md' }: PixelCardProps) {
  const { w, h, fs, corner } = SIZE_MAP[size];

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
          className="absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: '#f8f8f0',
            border: '3px solid #0a0a18',
            borderRadius: corner,
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
            borderRadius: corner,
            border: '3px solid var(--neon-cyan)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * 卡牌正面：绝对定位角标 + 中央花色，不溢出
 */
function CardFace({ card, fs }: { card: Card; fs: number }) {
  const isRed = isRedSuit(card.suit);
  const color = isRed ? '#cc0000' : '#0a0a18';
  const suit = SUIT_SYMBOL[card.suit];
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
    color,
    fontFamily: 'monospace',
    fontWeight: 900,
  };

  return (
    <>
      {/* 左上角标 */}
      <div style={{ ...cornerStyle, top: 3, left: 4, fontSize: fs }}>
        <span style={{ letterSpacing: '-1px' }}>{card.rank}</span>
        <span style={{ fontSize: fs * 0.62, marginTop: 1 }}>{suit}</span>
      </div>

      {/* 中央大花色 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: fs * 2.2,
          lineHeight: 1,
          color,
          fontWeight: 900,
        }}
      >
        {suit}
      </div>

      {/* 右下角标（旋转180°） */}
      <div style={{ ...cornerStyle, bottom: 3, right: 4, fontSize: fs, transform: 'rotate(180deg)' }}>
        <span style={{ letterSpacing: '-1px' }}>{card.rank}</span>
        <span style={{ fontSize: fs * 0.62, marginTop: 1 }}>{suit}</span>
      </div>
    </>
  );
}

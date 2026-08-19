import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CrtOverlay } from './components/CrtOverlay';
import { PixelCard } from './components/PixelCard';
import { createDeck, shuffle, type Card } from '@holdem/shared';

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [shake, setShake] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // 准备一张演示牌
  useEffect(() => {
    const deck = shuffle(createDeck());
    setCards(deck.slice(0, 5));
  }, []);

  // 翻牌演示
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  // 震屏演示按钮
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  return (
    <div className={`w-full h-full bg-bg-deep ${shake ? 'shake' : ''}`}>
      <CrtOverlay />

      <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4 overflow-auto">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="title-font text-3xl md:text-5xl glow-pink mb-2">HOLD&apos;EM</h1>
          <p className="font-screen text-sm md:text-base glow-cyan tracking-widest">★ 德州扑克 · TEXAS HOLD&apos;EM ★</p>
        </motion.div>

        {/* 公共牌演示 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-3 items-center justify-center flex-wrap"
        >
          {cards.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ y: -60, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
            >
              <PixelCard card={c} revealed={revealed} highlight={i === 2} size="lg" />
            </motion.div>
          ))}
        </motion.div>

        {/* 底池数字演示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pixel-panel px-6 py-3 flex items-center gap-3"
        >
          <span className="font-screen text-glow-cyan text-glow-cyan text-sm">POT</span>
          <motion.span
            key={1000}
            initial={{ scale: 1.6, color: '#ffe600' }}
            animate={{ scale: 1, color: '#ffe600' }}
            transition={{ duration: 0.4 }}
            className="font-mono text-3xl glow-yellow"
          >
            1,000
          </motion.span>
          <span className="font-screen text-glow-yellow text-xs">CHIPS</span>
        </motion.div>

        {/* 按钮组 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex gap-4 flex-wrap justify-center"
        >
          <button className="pixel-btn pixel-btn-pink">FOLD</button>
          <button className="pixel-btn pixel-btn-cyan">CALL 20</button>
          <button className="pixel-btn pixel-btn-green" onClick={triggerShake}>
            ALL-IN!
          </button>
        </motion.div>

        {/* 状态提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center"
        >
          <p className="font-screen text-xs glow-green blink">▶ 系统就绪 · 等待启动开发 ◀</p>
          <p className="font-mono text-base text-gray-400 mt-2">阶段 0 脚手架 · 像素风基础质感已就绪</p>
        </motion.div>
      </div>
    </div>
  );
}

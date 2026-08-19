import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深色霓虹背景
        bg: {
          deep: '#0a0a18',     // 最深背景
          dark: '#12122b',     // 牌桌背景
          mid: '#1a1a3a',      // 中层
          light: '#252550',    // 浅层
        },
        // 霓虹强调色
        neon: {
          pink: '#ff2d75',
          cyan: '#00f0ff',
          green: '#39ff14',
          yellow: '#ffe600',
          purple: '#b026ff',
          red: '#ff2222',
          blue: '#1e90ff',
        },
        gold: '#ffcc00',
        felt: '#0d3b1f', // 牌桌绒布绿
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        screen: ['"Silkscreen"', 'monospace'],
        mono: ['"VT323"', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 8px currentColor, 0 0 16px currentColor',
        'neon-lg': '0 0 12px currentColor, 0 0 24px currentColor, 0 0 48px currentColor',
      },
    },
  },
  plugins: [],
} satisfies Config;

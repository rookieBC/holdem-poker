import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../lib/logger.js';

// 基于源文件位置定位 data 目录，避免受 process.cwd() 影响
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/store/ -> 向上两级到 backend/ -> backend/data
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** 读取 JSON 文件，不存在返回默认值 */
export function readJSON<T>(filename: string, fallback: T): T {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return fallback;
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (e) {
    logger.warn(`读取 ${filename} 失败: ${(e as Error).message}`);
    return fallback;
  }
}

/** 写入 JSON 文件（带防抖标记，避免频繁写入） */
const pendingWrites = new Set<string>();
export function writeJSON<T>(filename: string, data: T): void {
  if (pendingWrites.has(filename)) return;
  pendingWrites.add(filename);
  setTimeout(() => {
    pendingWrites.delete(filename);
    try {
      ensureDir();
      const filepath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      logger.warn(`写入 ${filename} 失败: ${(e as Error).message}`);
    }
  }, 500);
}

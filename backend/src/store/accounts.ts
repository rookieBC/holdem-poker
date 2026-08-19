import type { Account, PlayerStats } from '@holdem/shared';
import { genId, genToken } from '../lib/id.js';
import { readJSON, writeJSON } from './persistence.js';
import { logger } from '../lib/logger.js';

const ACCOUNTS_FILE = 'accounts.json';

interface AccountStore {
  accounts: Account[];
}

const accounts = new Map<string, Account>(); // id -> account
const tokenIndex = new Map<string, string>(); // token -> accountId
let loaded = false;

const ADJECTIVES = ['幸运', '传奇', '神秘', '疯狂', '冷静', '激进', '老练', '新手', '热血', '冷酷'];
const NOUNS = ['鲨鱼', '猎手', '赌徒', '玩家', '牛仔', '幽灵', '王牌', '赌神', '老炮', '新秀'];

function randomUsername(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}_${Math.floor(1000 + Math.random() * 9000)}`;
}

function defaultStats(): PlayerStats {
  return { gamesPlayed: 0, wins: 0, totalChipsWon: 0, bestHand: null };
}

/** 从磁盘加载账户（启动时调用一次） */
export function loadAccounts(): void {
  if (loaded) return;
  loaded = true;
  const store = readJSON<AccountStore>(ACCOUNTS_FILE, { accounts: [] });
  for (const acc of store.accounts) {
    accounts.set(acc.id, acc);
    tokenIndex.set(acc.token, acc.id);
  }
  logger.info(`已加载 ${accounts.size} 个账户`);
}

/** 持久化所有账户到磁盘 */
function persist(): void {
  writeJSON(ACCOUNTS_FILE, { accounts: Array.from(accounts.values()) });
}

/** 一键注册/登录：凭 token 自动登录，无则创建新账户 */
export function loginOrCreate(token?: string): Account {
  if (!loaded) loadAccounts();

  if (token) {
    const accId = tokenIndex.get(token);
    if (accId) {
      const acc = accounts.get(accId);
      if (acc) return acc;
    }
  }

  const id = genId('u');
  const newToken = genToken();
  const account: Account = {
    id,
    username: randomUsername(),
    token: newToken,
    chips: 1000,
    inventory: [
      { id: 'xray', name: '透视镜', description: '翻牌前偷看一张即将翻开的公共牌', count: 1 },
      { id: 'insurance', name: '保险券', description: '本局若输牌返还50%已投入筹码', count: 1 },
    ],
    stats: defaultStats(),
    createdAt: Date.now(),
  };
  accounts.set(id, account);
  tokenIndex.set(newToken, id);
  persist();
  logger.info(`新账户: ${account.username} (${account.id})`);
  return account;
}

export function getAccountByToken(token: string): Account | undefined {
  if (!loaded) loadAccounts();
  const accId = tokenIndex.get(token);
  return accId ? accounts.get(accId) : undefined;
}

export function getAccountById(id: string): Account | undefined {
  if (!loaded) loadAccounts();
  return accounts.get(id);
}

/** 更新账户（筹码/背包/战绩），并持久化 */
export function updateAccount(acc: Account): void {
  accounts.set(acc.id, acc);
  tokenIndex.set(acc.token, acc.id);
  persist();
}

/** 记录一局结果到战绩 */
export function recordGameResult(acc: Account, won: boolean, chipsDelta: number, bestHand?: string): void {
  acc.stats.gamesPlayed++;
  if (won) {
    acc.stats.wins++;
    acc.stats.totalChipsWon += chipsDelta;
  }
  if (bestHand && (!acc.stats.bestHand || true)) {
    acc.stats.bestHand = bestHand;
  }
  updateAccount(acc);
}

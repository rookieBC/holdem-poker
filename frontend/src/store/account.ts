import { create } from 'zustand';
import type { Account } from '@holdem/shared';
import { api } from '../lib/socket';

interface AccountStore {
  account: Account | null;
  token: string | null;
  status: 'idle' | 'loading' | 'authed' | 'error';
  error: string | null;
  /** 从 localStorage 读取 token */
  loadToken: () => string | null;
  /** 一键登录/注册（自动用本地 token） */
  login: () => Promise<boolean>;
  /** 登出 */
  clear: () => void;
  setAccount: (acc: Account | null) => void;
}

const TOKEN_KEY = 'holdem_token';

export const useAccountStore = create<AccountStore>((set, get) => ({
  account: null,
  token: null,
  status: 'idle',
  error: null,

  loadToken: () => {
    const t = localStorage.getItem(TOKEN_KEY);
    set({ token: t });
    return t;
  },

  login: async () => {
    set({ status: 'loading', error: null });
    const token = get().token ?? localStorage.getItem(TOKEN_KEY);
    try {
      const res = await api.authLogin(token ?? undefined);
      if (res && 'error' in res) {
        set({ status: 'error', error: res.error });
        return false;
      }
      const acc = res as Account;
      localStorage.setItem(TOKEN_KEY, acc.token);
      set({ account: acc, token: acc.token, status: 'authed' });
      return true;
    } catch {
      set({ status: 'error', error: '网络错误' });
      return false;
    }
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ account: null, token: null, status: 'idle', error: null });
  },

  setAccount: (account) => set({ account }),
}));

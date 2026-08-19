import { create } from 'zustand';
import type { Account } from '@holdem/shared';

interface AccountStore {
  account: Account | null;
  token: string | null;
  setAccount: (acc: Account | null) => void;
  saveToken: (t: string) => void;
  loadToken: () => void;
  clear: () => void;
}

export const useAccountStore = create<AccountStore>((set) => ({
  account: null,
  token: null,
  setAccount: (account) => set({ account }),
  saveToken: (t) => {
    localStorage.setItem('holdem_token', t);
    set({ token: t });
  },
  loadToken: () => {
    const t = localStorage.getItem('holdem_token');
    set({ token: t });
  },
  clear: () => {
    localStorage.removeItem('holdem_token');
    set({ account: null, token: null });
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { accountService } from "../services/accountService";
import type { Account } from "../types";

interface AccountState {
  budgetId: string | null;
  accounts: Account[];
  /** Solde par compte ; « none » = mouvements sans compte. */
  balances: Record<string, number>;
  /** Épargne des objectifs rangée sur chaque compte (non comprise dans balances). */
  savings: Record<string, number>;
  isLoading: boolean;
  /** Recharge les comptes et soldes du budget (après chaque opération). */
  load: (budgetId: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  budgetId: null,
  accounts: [],
  balances: {},
  savings: {},
  isLoading: false,
  load: async (budgetId) => {
    if (get().budgetId !== budgetId) set({ budgetId, accounts: [], balances: {}, savings: {} });
    set({ isLoading: true });
    try {
      const [accounts, balances, savings] = await Promise.all([
        accountService.getAccounts(budgetId),
        accountService.getBalances(budgetId),
        accountService.getSavings(budgetId).catch(() => ({})),
      ]);
      if (get().budgetId === budgetId) set({ accounts, balances, savings });
    } finally {
      set({ isLoading: false });
    }
  },
}));

/** Rafraîchit les comptes du budget chargé, sans attendre (après une transaction…). */
export function refreshAccounts() {
  const { budgetId, load } = useAccountStore.getState();
  if (budgetId) load(budgetId).catch(() => {});
}

const LAST_KEY = (budgetId: string) => `accounts:last:${budgetId}`;

/** Dernier compte utilisé pour ce budget sur cet appareil (proposé par défaut). */
export async function lastAccountId(budgetId: string) {
  try {
    return await AsyncStorage.getItem(LAST_KEY(budgetId));
  } catch {
    return null;
  }
}

export async function rememberAccount(budgetId: string, accountId: string | null | undefined) {
  if (!accountId) return;
  try {
    await AsyncStorage.setItem(LAST_KEY(budgetId), accountId);
  } catch {
    // pas de mémorisation
  }
}

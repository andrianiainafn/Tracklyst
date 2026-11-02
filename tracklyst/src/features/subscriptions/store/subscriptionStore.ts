import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Subscription } from "../types/subscription.types";

interface SubscriptionState {
  /** Budget dont les abonnements sont chargés. */
  budgetId: string | null;
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;

  setSubscriptions: (budgetId: string, subscriptions: Subscription[]) => void;
  upsertSubscription: (subscription: Subscription) => void;
  removeSubscription: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const byNextOccurrence = (a: Subscription, b: Subscription) =>
  a.next_occurrence.localeCompare(b.next_occurrence);

export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    (set) => ({
      budgetId: null,
      subscriptions: [],
      isLoading: false,
      error: null,

      setSubscriptions: (budgetId, subscriptions) =>
        set({ budgetId, subscriptions, isLoading: false, error: null }),

      upsertSubscription: (subscription) =>
        set((state) => ({
          subscriptions: [
            ...state.subscriptions.filter((s) => s.id !== subscription.id),
            subscription,
          ].sort(byNextOccurrence),
        })),

      removeSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
    }),
    { name: "SubscriptionStore" },
  ),
);

import { supabase } from '@/src/lib/supabase/client';
import { useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import type { Transaction } from '../types/transaction.types';

/**
 * Subscribes to real-time Postgres changes on the transactions table
 * for the given budgetId. Keeps the Zustand store in sync automatically.
 *
 * Usage: call this once at the top of the transactions screen (or layout).
 */
export const useTransactionRealtime = (budgetId: string | undefined) => {
  useEffect(() => {
    if (!budgetId) return;

    const channel = supabase
      .channel(`transactions:${budgetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `budget_id=eq.${budgetId}`,
        },
        async (payload) => {
          // Fetch full row with category join, then push to store
          try {
            const newTx = payload.new as Transaction;
            // Re-fetch with category join
            const full = await transactionService.getTransactions(budgetId);
            const match = full.find((t) => t.id === newTx.id);
            if (match) useTransactionStore.getState().addTransaction(match);
          } catch {
            // Silently ignore realtime fetch errors
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `budget_id=eq.${budgetId}`,
        },
        async (payload) => {
          try {
            const updatedTx = payload.new as Transaction;
            const full = await transactionService.getTransactions(budgetId);
            const match = full.find((t) => t.id === updatedTx.id);
            if (match)
              useTransactionStore.getState().updateTransaction(updatedTx.id, match);
          } catch {
            // Silently ignore
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
          filter: `budget_id=eq.${budgetId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          if (deleted?.id) {
            useTransactionStore.getState().deleteTransaction(deleted.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [budgetId]);
};

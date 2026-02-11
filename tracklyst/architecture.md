# 🏗️ Architecture du Projet Tracklyst

## 📚 Stack Technique
- **Frontend**: React Native (Expo)
- **Styling**: NativeWind (Tailwind CSS pour React Native)
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navigation**: Expo Router (file-based routing)

---

## 📁 Structure de Projet (Best Practices)

```
tracklyst/
│
├── app/                              # 🚀 Expo Router - Navigation
│   ├── _layout.tsx                   # Root layout
│   ├── splashScreen.tsx              # Onboarding
│   ├── login.tsx                     # Authentification
│   ├── signup.tsx                    
│   │
│   ├── (tabs)/                       # 📱 Navigation principale
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Dashboard
│   │   ├── transactions.tsx
│   │   ├── goals.tsx
│   │   └── profile.tsx
│   │
│   └── (modal)/                      # Modal screens
│       ├── add-transaction.tsx
│       ├── add-goal.tsx
│       └── settings.tsx
│
├── src/
│   │
│   ├── components/                   # 🎨 Composants réutilisables
│   │   ├── ui/                       # Composants de base
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── transactions/             # Composants métier
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   └── CategoryPicker.tsx
│   │   │
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalProgress.tsx
│   │   │   └── GoalForm.tsx
│   │   │
│   │   ├── budget/
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── BudgetChart.tsx
│   │   │   └── BudgetSummary.tsx
│   │   │
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/                     # 🎯 Features (Domain-Driven Design)
│   │   │
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useLogin.ts
│   │   │   │   └── useSignup.ts
│   │   │   ├── services/
│   │   │   │   └── authService.ts
│   │   │   └── store/
│   │   │       └── authStore.ts       # Zustand store
│   │   │
│   │   ├── transactions/
│   │   │   ├── hooks/
│   │   │   │   ├── useTransactions.ts
│   │   │   │   ├── useAddTransaction.ts
│   │   │   │   ├── useUpdateTransaction.ts
│   │   │   │   └── useDeleteTransaction.ts
│   │   │   ├── services/
│   │   │   │   └── transactionService.ts
│   │   │   ├── store/
│   │   │   │   └── transactionStore.ts
│   │   │   └── types/
│   │   │       └── transaction.types.ts
│   │   │
│   │   ├── budgets/
│   │   │   ├── hooks/
│   │   │   │   ├── useBudgets.ts
│   │   │   │   └── useActiveBudget.ts
│   │   │   ├── services/
│   │   │   │   └── budgetService.ts
│   │   │   ├── store/
│   │   │   │   └── budgetStore.ts
│   │   │   └── types/
│   │   │       └── budget.types.ts
│   │   │
│   │   ├── goals/
│   │   │   ├── hooks/
│   │   │   │   ├── useGoals.ts
│   │   │   │   └── useGoalTransactions.ts
│   │   │   ├── services/
│   │   │   │   └── goalService.ts
│   │   │   ├── store/
│   │   │   │   └── goalStore.ts
│   │   │   └── types/
│   │   │       └── goal.types.ts
│   │   │
│   │   ├── categories/
│   │   │   ├── hooks/
│   │   │   │   └── useCategories.ts
│   │   │   ├── services/
│   │   │   │   └── categoryService.ts
│   │   │   ├── store/
│   │   │   │   └── categoryStore.ts
│   │   │   └── constants/
│   │   │       └── defaultCategories.ts
│   │   │
│   │   ├── groups/
│   │   │   ├── hooks/
│   │   │   │   ├── useGroups.ts
│   │   │   │   └── useGroupMembers.ts
│   │   │   ├── services/
│   │   │   │   └── groupService.ts
│   │   │   └── store/
│   │   │       └── groupStore.ts
│   │   │
│   │   └── recurring/
│   │       ├── hooks/
│   │       │   └── useRecurringRules.ts
│   │       ├── services/
│   │       │   └── recurringService.ts
│   │       └── store/
│   │           └── recurringStore.ts
│   │
│   ├── lib/                          # 🛠️ Utilitaires et configuration
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client
│   │   │   ├── queries.ts            # Requêtes réutilisables
│   │   │   └── subscriptions.ts      # Real-time subscriptions
│   │   │
│   │   ├── validation/
│   │   │   ├── schemas/              # Zod schemas
│   │   │   │   ├── transaction.schema.ts
│   │   │   │   ├── budget.schema.ts
│   │   │   │   └── goal.schema.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── utils/
│   │       ├── date.ts               # Date formatting
│   │       ├── currency.ts           # Currency formatting
│   │       ├── calculations.ts       # Balance, totals, etc.
│   │       └── helpers.ts
│   │
│   ├── hooks/                        # 🪝 Hooks globaux
│   │   ├── useColorScheme.ts
│   │   ├── useDebounce.ts
│   │   ├── useAsync.ts
│   │   └── useOnboarding.ts
│   │
│   ├── constants/                    # 📊 Constantes
│   │   ├── theme.ts                  # Colors, fonts, spacing
│   │   ├── config.ts                 # App configuration
│   │   └── enums.ts                  # Enums (TransactionType, etc.)
│   │
│   ├── types/                        # 📝 Types globaux
│   │   ├── global.d.ts
│   │   ├── supabase.ts               # Types générés par Supabase
│   │   └── navigation.ts
│   │
│   └── assets/                       # 🎨 Assets
│       ├── images/
│       ├── fonts/
│       └── icons/
│
├── supabase/                         # 🗄️ Configuration Supabase
│   ├── migrations/
│   │   └── 20250211_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
│
├── .env                              # Variables d'environnement
├── .env.example
├── app.json                          # Expo config
├── tailwind.config.js                # Tailwind config
├── tsconfig.json
└── package.json
```

---

## 🎯 Principes d'Architecture

### 1. **Feature-Based Organization** (Domain-Driven Design)
Chaque fonctionnalité (feature) est autonome avec :
- **hooks/** : Custom hooks pour la logique métier
- **services/** : Appels API Supabase
- **store/** : State management Zustand
- **types/** : TypeScript types spécifiques
- **components/** (optionnel) : Composants spécifiques à la feature

### 2. **Separation of Concerns**
- **app/** → Routing et pages (UI uniquement)
- **src/features/** → Logique métier
- **src/components/** → UI réutilisable
- **src/lib/** → Utilitaires et configuration

### 3. **Single Responsibility**
- Un fichier = Une responsabilité
- Un store = Une feature
- Un service = Un domaine métier

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Component                      │
│                    (app/transactions.tsx)                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    Custom Hook                           │
│           (features/transactions/hooks/                  │
│                useTransactions.ts)                       │
└───────────┬────────────────────────────┬────────────────┘
            │                            │
            ↓                            ↓
┌───────────────────────┐    ┌──────────────────────────┐
│   Zustand Store       │    │   Supabase Service       │
│  (transactionStore)   │◄───┤ (transactionService.ts)  │
└───────────────────────┘    └──────────┬───────────────┘
                                        │
                                        ↓
                             ┌──────────────────────┐
                             │   Supabase Client    │
                             │   (PostgreSQL)       │
                             └──────────────────────┘
```

---

## 📦 Exemples de Code

### 1. **Zustand Store** (features/transactions/store/transactionStore.ts)

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Transaction } from '../types/transaction.types';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  devtools(
    persist(
      (set) => ({
        transactions: [],
        isLoading: false,
        error: null,

        setTransactions: (transactions) =>
          set({ transactions, isLoading: false, error: null }),

        addTransaction: (transaction) =>
          set((state) => ({
            transactions: [transaction, ...state.transactions],
          })),

        updateTransaction: (id, updatedData) =>
          set((state) => ({
            transactions: state.transactions.map((t) =>
              t.id === id ? { ...t, ...updatedData } : t
            ),
          })),

        deleteTransaction: (id) =>
          set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
          })),

        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error, isLoading: false }),
        
        clearTransactions: () => set({ transactions: [], error: null }),
      }),
      {
        name: 'transaction-storage',
      }
    )
  )
);
```

### 2. **Supabase Service** (features/transactions/services/transactionService.ts)

```typescript
import { supabase } from '@/lib/supabase/client';
import type { Transaction, CreateTransactionDTO } from '../types/transaction.types';

export const transactionService = {
  // Récupérer toutes les transactions d'un budget
  async getTransactions(budgetId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .eq('budget_id', budgetId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  // Créer une transaction
  async createTransaction(transaction: CreateTransactionDTO): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  // Mettre à jour une transaction
  async updateTransaction(
    id: string,
    updates: Partial<CreateTransactionDTO>
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  // Supprimer une transaction
  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Récupérer les transactions par catégorie
  async getTransactionsByCategory(
    budgetId: string,
    categoryId: string
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('category_id', categoryId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  // Récupérer les transactions d'une période
  async getTransactionsByDateRange(
    budgetId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('budget_id', budgetId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },
};
```

### 3. **Custom Hook** (features/transactions/hooks/useTransactions.ts)

```typescript
import { useEffect } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { transactionService } from '../services/transactionService';
import { useBudgetStore } from '@/features/budgets/store/budgetStore';

export const useTransactions = () => {
  const {
    transactions,
    isLoading,
    error,
    setTransactions,
    setLoading,
    setError,
  } = useTransactionStore();

  const { activeBudget } = useBudgetStore();

  // Charger les transactions au montage
  useEffect(() => {
    if (!activeBudget) return;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        const data = await transactionService.getTransactions(activeBudget.id);
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    };

    loadTransactions();
  }, [activeBudget?.id]);

  // Ajouter une transaction
  const addTransaction = async (transaction: CreateTransactionDTO) => {
    try {
      setLoading(true);
      const newTransaction = await transactionService.createTransaction(transaction);
      useTransactionStore.getState().addTransaction(newTransaction);
      return newTransaction;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une transaction
  const updateTransaction = async (
    id: string,
    updates: Partial<CreateTransactionDTO>
  ) => {
    try {
      setLoading(true);
      const updated = await transactionService.updateTransaction(id, updates);
      useTransactionStore.getState().updateTransaction(id, updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une transaction
  const deleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      await transactionService.deleteTransaction(id);
      useTransactionStore.getState().deleteTransaction(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
```

### 4. **Types** (features/transactions/types/transaction.types.ts)

```typescript
export interface Transaction {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
  is_recurring: boolean;
  recurring_rule_id: string | null;
  created_by: string | null;
  created_at: string;
  
  // Relations
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CreateTransactionDTO {
  budget_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  is_recurring?: boolean;
  recurring_rule_id?: string;
}

export interface UpdateTransactionDTO extends Partial<CreateTransactionDTO> {}
```

### 5. **Composant UI** (app/(tabs)/transactions.tsx)

```typescript
import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function TransactionsScreen() {
  const { transactions, isLoading, error } = useTransactions();

  if (isLoading && transactions.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard transaction={item} />}
        ListEmptyComponent={
          <EmptyState
            title="Aucune transaction"
            description="Ajoutez votre première transaction"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => {}} />
        }
        contentContainerClassName="p-4"
      />
    </View>
  );
}
```

---

## 🔐 Configuration Supabase

### lib/supabase/client.ts

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 🎨 NativeWind (Tailwind) Configuration

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
      },
    },
  },
  plugins: [],
};
```

---

## 🚀 Best Practices

### 1. **État Local vs Global**
- **Local** (useState, useReducer) : UI state, formulaires
- **Global** (Zustand) : Données partagées, cache, auth

### 2. **Naming Conventions**
- **Composants** : PascalCase (`TransactionCard.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useTransactions.ts`)
- **Services** : camelCase avec suffixe `Service` (`transactionService.ts`)
- **Stores** : camelCase avec suffixe `Store` (`transactionStore.ts`)
- **Types** : PascalCase (`Transaction`, `CreateTransactionDTO`)

### 3. **Error Handling**
```typescript
try {
  const data = await service.getData();
  return data;
} catch (error) {
  if (error instanceof Error) {
    console.error('[Feature] Error:', error.message);
    throw new Error(`Failed to fetch: ${error.message}`);
  }
  throw new Error('Unknown error occurred');
}
```

### 4. **Loading States**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await someAsyncOperation();
  } finally {
    setIsLoading(false); // Toujours désactiver le loading
  }
};
```

### 5. **Real-time Subscriptions**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('transactions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `budget_id=eq.${budgetId}`,
      },
      (payload) => {
        // Handle real-time updates
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [budgetId]);
```

---

## 📝 Variables d'Environnement

### .env.example

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# App
APP_NAME=Tracklyst
API_URL=https://api.tracklyst.com
```

---

## ✅ Checklist d'Implémentation

- [ ] Configurer Supabase client
- [ ] Créer les types TypeScript depuis Supabase
- [ ] Implémenter les stores Zustand par feature
- [ ] Créer les services API
- [ ] Développer les custom hooks
- [ ] Construire les composants UI
- [ ] Ajouter la gestion d'erreurs
- [ ] Implémenter les real-time subscriptions
- [ ] Ajouter la validation (Zod)
- [ ] Tester les features critiques
- [ ] Optimiser les performances
- [ ] Documenter le code

---

Cette architecture suit les **best practices** de React Native, Zustand et Supabase pour un projet scalable et maintenable ! 🚀
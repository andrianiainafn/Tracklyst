import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        session: null,
        user: null,
        isLoading: false,
        isInitialized: false,
        error: null,

        setSession: (session) =>
          set({ session, user: session?.user ?? null }),

        setUser: (user) =>
          set({ user }),

        setLoading: (isLoading) =>
          set({ isLoading }),

        setInitialized: (isInitialized) =>
          set({ isInitialized }),

        setError: (error) =>
          set({ error, isLoading: false }),

        clearAuth: () =>
          set({ session: null, user: null, error: null }),
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({ session: state.session, user: state.user }),
      }
    )
  )
);

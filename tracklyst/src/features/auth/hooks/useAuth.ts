import { supabase } from "@/src/lib/supabase";
import { useEffect } from "react";
import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";

/**
 * Core auth hook – initializes the session listener.
 * Mount ONCE in your root layout (_layout.tsx).
 */
export const useAuth = () => {
  const {
    session,
    user,
    isLoading,
    isInitialized,
    error,
    setSession,
    setInitialized,
    setError,
    clearAuth,
  } = useAuthStore();

  useEffect(() => {
    // 1. Load initial session
    authService
      .getSession()
      .then((session) => {
        setSession(session);
        setInitialized(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load session");
        setInitialized(true);
      });

    // 2. Listen to auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    isLoading,
    isInitialized,
    error,
    isAuthenticated: !!session,
  };
};

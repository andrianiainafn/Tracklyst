import { useState } from "react";

import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";

export const useSignup = () => {
  const { setSession, setLoading, setError, isLoading, error } = useAuthStore();
  const [emailConfirmationRequired, setEmailConfirmationRequired] =
    useState(false);

  const signup = async (email: string, password: string, fullName?: string) => {
    if (!email || !password) {
      setError("Email and password are required");
      return false;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await authService.signUp(email, password, fullName);

      if (session) {
        // Auto-confirmed (e.g. in dev mode or email confirmations disabled)
        setSession(session);
        return true;
      } else {
        // Email confirmation required
        setEmailConfirmationRequired(true);
        return true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signupWithOAuth = async (provider: "github" | "google" | "apple") => {
    try {
      setLoading(true);
      setError(null);
      const session = await authService.signInWithOAuth(provider);
      if (session) setSession(session);
      return !!session;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth signup failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    signup,
    signupWithOAuth,
    emailConfirmationRequired,
    isLoading,
    error,
    clearError,
  };
};

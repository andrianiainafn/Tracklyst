import { useState } from "react";
import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";

export const useLogin = () => {
  const { setSession, setLoading, setError, isLoading, error } = useAuthStore();
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const loginWithPassword = async (email: string, password: string) => {
    if (!email || !password) {
      setError("Email and password are required");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await authService.signInWithPassword(email, password);
      if (session) setSession(session);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOAuth = async (provider: "github" | "google" | "apple") => {
    try {
      setLoading(true);
      setError(null);
      const session = await authService.signInWithOAuth(provider);
      if (session) setSession(session);
      return !!session;
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth login failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async (email: string) => {
    if (!email) {
      setError("Email is required");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      await authService.sendMagicLink(email);
      setMagicLinkSent(true);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send magic link";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    loginWithPassword,
    loginWithOAuth,
    sendMagicLink,
    magicLinkSent,
    isLoading,
    error,
    clearError,
  };
};

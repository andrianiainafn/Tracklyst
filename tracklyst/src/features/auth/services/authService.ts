import { supabase } from "@/src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
  scheme: "tracklyst",
});

/**
 * Parses query params AND hash fragment params from a URL.
 * Supabase can return tokens in either location depending on the flow.
 */
function extractTokensFromUrl(url: string): Record<string, string> {
  // Parse both the query string and the hash fragment
  const [base, fragment] = url.split("#");
  const queryParams = Object.fromEntries(new URL(base).searchParams);
  const hashParams = fragment
    ? Object.fromEntries(new URLSearchParams(fragment))
    : {};
  return { ...queryParams, ...hashParams };
}

export const authService = {
  /**
   * Creates a Supabase session from a deep link URL (OAuth or Magic Link callback)
   */
  async createSessionFromUrl(url: string): Promise<Session | null> {
    const params = extractTokensFromUrl(url);

    if (params.error_code)
      throw new Error(params.error_description ?? params.error_code);

    const { access_token, refresh_token } = params;
    if (!access_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) throw error;
    return data.session;
  },

  /**
   * OAuth sign-in (GitHub, Google, Apple, etc.)
   */
  async signInWithOAuth(
    provider: "github" | "google" | "apple",
  ): Promise<Session | null> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("No OAuth URL returned");

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type === "success") {
      return await authService.createSessionFromUrl(res.url);
    }

    return null;
  },

  /**
   * Sign in with email + password
   */
  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<Session | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;
    return data.session;
  },

  /**
   * Send a Magic Link to the user's email
   */
  async sendMagicLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw error;
  },

  /**
   * Sign up with email + password
   */
  async signUp(
    email: string,
    password: string,
    fullName?: string,
  ): Promise<Session | null> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName ?? "",
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw error;
    return data.session;
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    if (error) throw error;
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },
};

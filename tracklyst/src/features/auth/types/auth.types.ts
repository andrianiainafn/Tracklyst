import type { Session, User } from '@supabase/supabase-js';

export type OAuthProvider = 'github' | 'google' | 'apple';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends AuthCredentials {
  fullName?: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

import { createClient } from "@supabase/supabase-js";

// Même projet Supabase que l'app mobile : mêmes comptes, mêmes données (RLS).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
);

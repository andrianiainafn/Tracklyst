import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Ouvert depuis le lien « Réinitialiser le mot de passe » (web) : noté avant que
 * Supabase ne retire les jetons de l'URL, pour proposer le nouveau mot de passe.
 */
export const openedFromRecoveryLink =
    Platform.OS === 'web' && typeof window !== 'undefined' && /type=recovery/.test(window.location.href);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Sur le web, le lien de confirmation revient avec la session dans l'URL.
        detectSessionInUrl: Platform.OS === 'web',
    },
});

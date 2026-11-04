import { supabase } from "@/src/lib/supabase";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createFieldCrypto } from "./fields";
import { createKeyManager } from "./manager";

/**
 * Clé privée gardée dans le stockage chiffré du téléphone (Keychain / Keystore) ;
 * sur le web, dans le navigateur (comme la session), effacée à la déconnexion.
 */
const storage =
  Platform.OS === "web"
    ? {
        get: async (key: string) => {
          try {
            return window.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        set: async (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            // navigation privée : la clé reste en mémoire
          }
        },
        remove: async (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch {
            // idem
          }
        },
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        remove: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const keyManager = createKeyManager({
  supabase,
  random: (length) => Crypto.getRandomBytes(length),
  storage,
});

export const fieldCrypto = createFieldCrypto(keyManager, supabase);
export { LOCKED_TEXT } from "./core";

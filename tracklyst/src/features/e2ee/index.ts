import { supabase } from "@/src/lib/supabase";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { createFieldCrypto } from "./fields";
import { createKeyManager } from "./manager";

/** Clé privée gardée dans le stockage chiffré du téléphone (Keychain / Keystore). */
export const keyManager = createKeyManager({
  supabase,
  random: (length) => Crypto.getRandomBytes(length),
  storage: {
    get: (key) => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value),
    remove: (key) => SecureStore.deleteItemAsync(key),
  },
});

export const fieldCrypto = createFieldCrypto(keyManager, supabase);
export { LOCKED_TEXT } from "./core";

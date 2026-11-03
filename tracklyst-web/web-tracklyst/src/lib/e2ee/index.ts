"use client";

import { supabase } from "@/lib/supabase";
import { createFieldCrypto } from "./fields";
import { createKeyManager } from "./manager";

/**
 * Clé privée gardée dans le navigateur (localStorage, comme la session) :
 * effacée à la déconnexion.
 */
export const keyManager = createKeyManager({
  supabase,
  random: (length) => crypto.getRandomValues(new Uint8Array(length)),
  storage: {
    get: async (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Navigation privée : la clé reste en mémoire pour la session.
      }
    },
    remove: async (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // idem
      }
    },
  },
});

export const fieldCrypto = createFieldCrypto(keyManager, supabase);
export { LOCKED_TEXT } from "./core";

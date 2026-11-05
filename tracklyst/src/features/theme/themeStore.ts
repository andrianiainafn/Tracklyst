import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Apparence choisie : comme le téléphone / navigateur, ou forcée. */
export type ThemeMode = "system" | "light" | "dark";

export const useThemeStore = create<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void }>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    { name: "theme-mode", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

import { create } from "zustand";

interface PrivacyState {
  /** Montants sensibles masqués. Volontairement non persisté : masqué à chaque ouverture. */
  hidden: boolean;
  toggle: () => void;
}

export const usePrivacyStore = create<PrivacyState>()((set) => ({
  hidden: true,
  toggle: () => set((state) => ({ hidden: !state.hidden })),
}));

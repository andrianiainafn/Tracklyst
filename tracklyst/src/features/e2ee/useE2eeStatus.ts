import { useSyncExternalStore } from "react";
import { keyManager } from "./index";

/** État du chiffrement (setup, locked, unlocked…), mis à jour en direct. */
export function useE2eeStatus() {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribe = keyManager.subscribe(onChange);
      return () => void unsubscribe();
    },
    () => keyManager.status,
  );
}

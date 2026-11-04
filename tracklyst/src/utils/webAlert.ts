import { Alert, type AlertButton } from "react-native";

/**
 * Sur le web, Alert.alert de React Native ne fait rien : on le remplace par
 * les boîtes de dialogue du navigateur (alerte simple ou confirmation).
 * À n'installer que sur le web.
 */
export function installWebAlert() {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === "cancel");
    const actions = buttons.filter((b) => b !== cancel);
    if (actions.length === 1) {
      if (window.confirm(text)) actions[0].onPress?.();
      else cancel?.onPress?.();
      return;
    }
    // Plusieurs choix (ex. Modifier / Supprimer) : proposés l'un après l'autre.
    for (const action of actions) {
      if (window.confirm(`${text}\n\n${action.text} ?`)) {
        action.onPress?.();
        return;
      }
    }
    cancel?.onPress?.();
  };
}

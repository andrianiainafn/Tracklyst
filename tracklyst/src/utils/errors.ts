/**
 * Message lisible pour n'importe quelle erreur. Les erreurs Supabase
 * (PostgrestError, AuthError…) ne sont pas toujours des `Error` mais
 * portent un `message` : sans ce helper, il était remplacé par le
 * texte générique et rien n'apparaissait dans les logs.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (__DEV__) console.warn(`[${fallback}]`, err);
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

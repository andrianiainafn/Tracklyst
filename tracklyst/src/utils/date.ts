/**
 * Format a date string (YYYY-MM-DD) for display.
 * Supports a `relative` option for "Aujourd'hui", "Hier", etc.
 */
export const formatDate = (
  dateStr: string,
  options?: { relative?: boolean; short?: boolean }
): string => {
  const date = new Date(dateStr + 'T00:00:00'); // force local time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (options?.relative) {
    const diff =
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff === 2) return 'Avant-hier';
    if (diff < 7) return `Il y a ${Math.round(diff)} jours`;
  }

  if (options?.short) {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Return ISO date string for today: "YYYY-MM-DD"
 */
export const todayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Return the first day of the current month: "YYYY-MM-01"
 */
export const startOfMonthISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

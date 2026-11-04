/**
 * Sur le web, le sélecteur de date natif n'existe pas : on ouvre le
 * calendrier du navigateur (input type="date"). Appeler depuis un appui.
 */
export function pickDateOnWeb({
  value,
  min,
  onPick,
}: {
  value: string; // "YYYY-MM-DD"
  min?: string;
  onPick: (iso: string) => void;
}) {
  const input = document.createElement("input");
  input.type = "date";
  input.value = value;
  if (min) input.min = min;
  Object.assign(input.style, { position: "fixed", opacity: "0", pointerEvents: "none", left: "50%", top: "50%" });
  document.body.appendChild(input);
  const cleanup = () => setTimeout(() => input.remove(), 0);
  input.addEventListener("change", () => {
    if (input.value) onPick(input.value);
    cleanup();
  });
  input.addEventListener("blur", cleanup);
  try {
    input.showPicker();
  } catch {
    // Navigateur sans showPicker : saisie au clavier.
    const typed = window.prompt("Date (AAAA-MM-JJ)", value);
    if (typed && /^\d{4}-\d{2}-\d{2}$/.test(typed)) onPick(typed);
    cleanup();
  }
}

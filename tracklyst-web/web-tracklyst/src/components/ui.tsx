"use client";

import { useEffect, type ReactNode } from "react";
import { iconPath, resolveIconKey } from "@/lib/icons";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Icône SVG (tracé Material Design Icons). */
export function Icon({ path, size = 20, className }: { path: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className} fill="currentColor">
      <path d={path} />
    </svg>
  );
}

/** Pastille teintée à la couleur de la catégorie (même rendu que l'app). */
export function CategoryIcon({
  category,
  iconKey,
  color,
  size = 40,
  filled = false,
}: {
  category?: { icon?: string | null; name?: string | null; color?: string | null; type?: string } | null;
  iconKey?: string | null;
  color?: string | null;
  size?: number;
  filled?: boolean;
}) {
  const tint = color ?? category?.color ?? "#64748B";
  const key = iconKey ?? resolveIconKey(category);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 40 ? 14 : 10,
        background: filled ? tint : `${tint}1F`,
        color: filled ? "#fff" : tint,
      }}
    >
      <Icon path={iconPath(key)} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-[18px] border border-line bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]", className)}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-45",
        variant === "primary" && "bg-tint text-white",
        variant === "secondary" && "border border-line bg-surface text-ink",
        variant === "danger" && "bg-danger-muted text-danger",
        className,
      )}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}

/** Panneau qui monte du bas (mobile), centré sur grand écran. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button aria-label="Fermer" className="absolute inset-0 bg-slate-950/45" onClick={onClose} />
      <div className="animate-sheet-up relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {title && <h2 className="mb-3 text-lg font-extrabold tracking-tight">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[14px] bg-surface-alt p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition",
            o.value === value ? "bg-surface font-bold text-ink shadow-sm" : "text-subtle",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Anneau de progression (0..1), contenu au centre. */
export function ProgressRing({
  progress,
  size = 56,
  stroke = 6,
  color,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-alt" />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
          />
        )}
      </svg>
      {children}
    </span>
  );
}

export function Meter({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
      <div className="h-full rounded-full" style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%`, background: color }} />
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-2 px-1 text-[11px] font-bold tracking-[0.12em] text-subtle">{children}</h2>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-[14px] bg-danger-muted px-4 py-3 text-[13px] text-danger">{message}</div>;
}

export const inputClass =
  "h-12 w-full min-w-0 rounded-[14px] border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-subtle focus:border-tint";

/**
 * Libellé + champ de formulaire. `group` pour un ensemble de boutons (puces,
 * couleurs…) : un <label> transmettrait au premier bouton les taps tombés à
 * côté des puces (ex. désélection du type de compte).
 */
export function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  const content = (
    <>
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5">
      {content}
    </div>
  ) : (
    <label className="flex min-w-0 flex-col gap-1.5">{content}</label>
  );
}

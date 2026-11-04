import type { Metadata } from "next";
import Link from "next/link";
import {
  mdiAndroid,
  mdiArrowRight,
  mdiBellRingOutline,
  mdiBus,
  mdiCalendarClock,
  mdiCartOutline,
  mdiCellphone,
  mdiChevronDown,
  mdiDownload,
  mdiEyeOutline,
  mdiGasStationOutline,
  mdiHomeOutline,
  mdiLightningBoltOutline,
  mdiMedicalBag,
  mdiPiggyBankOutline,
  mdiSchoolOutline,
  mdiSilverwareForkKnife,
  mdiStarFourPoints,
  mdiSync,
  mdiWalletOutline,
  mdiWeb,
  mdiWifi,
} from "@mdi/js";
import { Icon } from "@/components/ui";
import { DownloadQr } from "@/components/landing/DownloadQr";
import { HeroVisual } from "@/components/landing/PhoneMockup";
import { Reveal } from "@/components/landing/Reveal";
import { APK_URL } from "@/lib/download";

export const metadata: Metadata = {
  title: "Tracklyst · Votre budget mensuel, maîtrisé",
  description:
    "Plafonds par catégorie, abonnements, objectifs d'épargne et rappels : gérez votre argent en Ariary sur Android et sur le web.",
  openGraph: {
    title: "Tracklyst · Votre budget mensuel, maîtrisé",
    description: "Plafonds, abonnements, épargne et rappels, en Ariary.",
    images: ["/tracklyst-logo.png"],
    locale: "fr_FR",
    type: "website",
  },
};

const CHIPS = [
  { icon: mdiGasStationOutline, label: "Essence", color: "#fbbf24" },
  { icon: mdiHomeOutline, label: "Loyer", color: "#60a5fa" },
  { icon: mdiLightningBoltOutline, label: "Électricité", color: "#a78bfa" },
  { icon: mdiWifi, label: "Internet", color: "#38bdf8" },
  { icon: mdiCartOutline, label: "Courses", color: "#34d399" },
  { icon: mdiBus, label: "Transport", color: "#f472b6" },
  { icon: mdiSilverwareForkKnife, label: "Restaurant", color: "#fb923c" },
  { icon: mdiSchoolOutline, label: "Écolage", color: "#818cf8" },
  { icon: mdiMedicalBag, label: "Santé", color: "#f87171" },
  { icon: mdiCellphone, label: "Crédit téléphone", color: "#2dd4bf" },
  { icon: mdiPiggyBankOutline, label: "Épargne", color: "#34d399" },
];

const STEPS = [
  { title: "Installez l'app", text: "Téléchargez l'APK Android ou ouvrez la version web, puis créez votre compte en 30 secondes." },
  { title: "Posez vos repères", text: "Catégories, plafonds du mois, abonnements, objectifs : tout est prêt en quelques touches." },
  { title: "Laissez-vous guider", text: "Notez vos dépenses. Rappels et alertes arrivent avant qu'il ne soit trop tard." },
];

const FAQ = [
  {
    q: "Pourquoi un fichier APK et pas le Play Store ?",
    a: "Tracklyst est distribué directement depuis ce site. À la première installation, Android vous demande d'autoriser votre navigateur à installer des applications : acceptez, puis ouvrez le fichier téléchargé.",
  },
  {
    q: "J'ai un iPhone, comment faire ?",
    a: "Utilisez la version web : dans Safari, ouvrez Tracklyst, touchez Partager puis « Sur l'écran d'accueil ». Elle s'ouvre alors comme une application.",
  },
  {
    q: "Mes données sont-elles les mêmes sur le téléphone et le web ?",
    a: "Oui. Le même compte donne accès aux mêmes budgets, transactions et objectifs, mis à jour des deux côtés.",
  },
  {
    q: "Quelle devise est utilisée ?",
    a: "L'Ariary (Ar) par défaut, avec des montants sans décimales, comme on les manipule au quotidien.",
  },
];

/* ─── Petits éléments ─────────────────────────────────────────────────────── */

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={32} height={32} />
      <span className="text-[18px] font-extrabold tracking-tight">Tracklyst</span>
    </span>
  );
}

function AndroidButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={APK_URL}
      download
      className={`group relative inline-flex h-[60px] items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-7 text-[#03140e] shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_20px_60px_-10px_rgba(52,211,153,0.6)] transition hover:-translate-y-0.5 active:scale-[0.98] ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <Icon path={mdiAndroid} size={28} className="relative text-[#10b981]" />
      <span className="relative text-left leading-tight">
        <span className="block text-[11px] font-semibold text-black/55">Télécharger pour</span>
        <span className="block text-[17px] font-extrabold">Android</span>
      </span>
      <Icon path={mdiDownload} size={20} className="relative ml-1 text-black/40 transition group-hover:translate-y-0.5" />
    </a>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-emerald-300">
      <Icon path={mdiStarFourPoints} size={13} />
      {children}
    </span>
  );
}

function BentoCard({
  children,
  className = "",
  title,
  text,
}: {
  children?: React.ReactNode;
  className?: string;
  title: string;
  text: string;
}) {
  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-7 transition duration-500 hover:border-emerald-400/30 ${className}`}
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-emerald-400/0 blur-3xl transition duration-500 group-hover:bg-emerald-400/20" />
      <div className="relative flex-1">{children}</div>
      <div className="relative mt-6">
        <h3 className="text-[19px] font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-white/55">{text}</p>
      </div>
    </div>
  );
}

/* ─── Visuels des cartes ──────────────────────────────────────────────────── */

function CashflowVisual() {
  const months = ["Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov."];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold text-white/45">Solde du mois</p>
          <p className="text-[30px] font-extrabold tracking-tight text-white">+610 000 Ar</p>
        </div>
        <div className="flex gap-4 text-[12px] font-semibold">
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-[#34d399]" /> Revenus
          </span>
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-[#f97316]" /> Dépenses
          </span>
        </div>
      </div>
      <svg viewBox="0 0 600 170" className="mt-5 h-40 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 85, 130].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path d="M0 95 C60 90 90 70 120 72 S220 80 240 60 S330 40 360 48 S450 30 480 26 S560 18 600 14 L600 170 L0 170 Z" fill="url(#inc)" />
        <path d="M0 95 C60 90 90 70 120 72 S220 80 240 60 S330 40 360 48 S450 30 480 26 S560 18 600 14" fill="none" stroke="#34d399" strokeWidth="3" />
        <path d="M0 120 C60 112 90 118 120 110 S220 98 240 104 S330 112 360 100 S450 96 480 102 S560 92 600 96" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="1 0" />
        <circle cx="600" cy="14" r="6" fill="#34d399" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-white/35">
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function LimitsVisual() {
  const rows = [
    { label: "Essence", ratio: 0.82, color: "#fbbf24", note: "82 %" },
    { label: "Courses", ratio: 0.64, color: "#34d399", note: "64 %" },
    { label: "Sorties", ratio: 1, color: "#f87171", note: "Dépassé" },
  ];
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold text-white">{r.label}</span>
            <span className="font-bold" style={{ color: r.color }}>
              {r.note}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full"
              style={{ width: `${r.ratio * 100}%`, background: `linear-gradient(90deg, ${r.color}99, ${r.color})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SubscriptionsVisual() {
  const subs = [
    { day: "05", label: "Électricité", amount: "85 000", icon: mdiLightningBoltOutline, color: "#a78bfa" },
    { day: "10", label: "Internet", amount: "99 000", icon: mdiWifi, color: "#38bdf8" },
    { day: "01", label: "Loyer", amount: "600 000", icon: mdiHomeOutline, color: "#60a5fa" },
  ];
  return (
    <div className="space-y-2.5">
      {subs.map((s) => (
        <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-3">
          <span className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-white/[0.06] leading-none">
            <span className="text-[14px] font-extrabold text-white">{s.day}</span>
            <span className="text-[9px] font-bold uppercase text-white/40">nov.</span>
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.color}22`, color: s.color }}>
            <Icon path={s.icon} size={17} />
          </span>
          <span className="flex-1 text-[13px] font-semibold text-white">{s.label}</span>
          <span className="text-[13px] font-bold text-white/80">{s.amount} Ar</span>
        </div>
      ))}
    </div>
  );
}

function GoalVisual() {
  const c = 2 * Math.PI * 52;
  return (
    <div className="flex items-center justify-center py-2">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6ee7b7" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * 0.64} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-extrabold tracking-tight text-white">64 %</span>
          <span className="text-[11px] font-semibold text-white/45">Terrain</span>
        </div>
      </div>
    </div>
  );
}

function PrivacyVisual() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#34d399] to-[#065f46] p-5 text-white">
      <div className="flex items-center justify-between text-[12px] font-semibold text-white/80">
        Solde disponible
        <Icon path={mdiEyeOutline} size={18} />
      </div>
      <div className="relative mt-1 h-10">
        <p className="absolute inset-0 text-[28px] font-extrabold tracking-tight transition duration-500 group-hover:opacity-0 group-hover:blur-sm">
          Ar ••••••••
        </p>
        <p className="absolute inset-0 text-[28px] font-extrabold tracking-tight opacity-0 blur-sm transition duration-500 group-hover:opacity-100 group-hover:blur-0">
          Ar 2 450 000
        </p>
      </div>
      <p className="mt-2 text-[11px] font-medium text-white/70">Survolez ou touchez pour afficher</p>
    </div>
  );
}

function BudgetsVisual() {
  const budgets = [
    { name: "Personnel", icon: mdiWalletOutline, active: true },
    { name: "Foyer", icon: mdiHomeOutline, active: false },
    { name: "Épargne", icon: mdiPiggyBankOutline, active: false },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {budgets.map((b) => (
        <span
          key={b.name}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold ${
            b.active ? "bg-emerald-400 text-[#03140e]" : "border border-white/10 bg-white/[0.04] text-white/70"
          }`}
        >
          <Icon path={b.icon} size={17} />
          {b.name}
        </span>
      ))}
      <div className="mt-3 w-full space-y-2">
        {[
          { label: "Notification", text: "Prélèvement Internet aujourd'hui · 99 000 Ar", icon: mdiBellRingOutline },
          { label: "Rappel", text: "« Terrain » : échéance dans 7 jours", icon: mdiCalendarClock },
        ].map((n) => (
          <div key={n.text} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <Icon path={n.icon} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{n.label}</p>
              <p className="truncate text-[13px] font-semibold text-white">{n.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#030807] text-white [color-scheme:dark]">
      {/* Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/[0.08] bg-[#030807]/60 pl-4 pr-2 backdrop-blur-xl">
          <Link href="/" aria-label="Tracklyst, accueil">
            <Logo />
          </Link>
          <div className="hidden items-center gap-8 text-[14px] font-medium text-white/60 md:flex">
            <a href="#fonctionnalites" className="transition hover:text-white">Fonctionnalités</a>
            <a href="#etapes" className="transition hover:text-white">Comment ça marche</a>
            <a href="#faq" className="transition hover:text-white">Questions</a>
          </div>
          <div className="flex items-center gap-1.5">
            <a href="/app" className="hidden h-10 items-center rounded-xl px-4 text-[14px] font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-white sm:flex">
              Se connecter
            </a>
            <a
              href="#telecharger"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-400 px-4 text-[14px] font-bold text-[#03140e] transition hover:bg-emerald-300"
            >
              <Icon path={mdiDownload} size={18} />
              Télécharger
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden pt-36 sm:pt-44">
          <div aria-hidden className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
          <div aria-hidden className="animate-aurora absolute -left-40 -top-40 -z-10 h-[560px] w-[560px] rounded-full bg-emerald-500/25 blur-[140px]" />
          <div aria-hidden className="animate-aurora absolute -right-40 top-20 -z-10 h-[480px] w-[480px] rounded-full bg-teal-400/15 blur-[140px] [animation-delay:-9s]" />

          <div className="mx-auto max-w-5xl px-5 text-center">
            <div className="animate-rise">
              <Eyebrow>Pensé pour l&apos;Ariary</Eyebrow>
            </div>
            <div className="animate-rise" style={{ animationDelay: "100ms" }}>
              <h1 className="mt-7 text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[68px] lg:text-[84px]">
                Votre argent,
                <br />
                <span className="animate-shine bg-gradient-to-r from-emerald-300 via-white to-emerald-300 bg-clip-text text-transparent">
                  enfin sous contrôle.
                </span>
              </h1>
            </div>
            <div className="animate-rise" style={{ animationDelay: "200ms" }}>
              <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-white/60 sm:text-[19px]">
                Plafonds pour l&apos;essence et les petites dépenses, rappels d&apos;abonnements, objectifs
                d&apos;épargne. Tracklyst vous dit où vous en êtes, chaque jour du mois.
              </p>
            </div>
            <div className="animate-rise" style={{ animationDelay: "300ms" }}>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <AndroidButton className="w-full sm:w-auto" />
                <a
                  href="/app"
                  className="inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-7 text-[15px] font-bold backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08] sm:w-auto"
                >
                  <Icon path={mdiWeb} size={20} className="text-emerald-300" />
                  Ouvrir la version web
                </a>
              </div>
            </div>
          </div>

          <div className="animate-rise mt-20 px-5 pb-10 sm:mt-24" style={{ animationDelay: "400ms" }}>
            <HeroVisual />
          </div>

          {/* Catégories qui défilent */}
          <div className="relative mt-10 overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-marquee flex w-max gap-3">
              {[...CHIPS, ...CHIPS].map((c, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[14px] font-semibold text-white/75"
                >
                  <span style={{ color: c.color }}>
                    <Icon path={c.icon} size={18} className="shrink-0" />
                  </span>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="relative scroll-mt-24 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Eyebrow>Fonctionnalités</Eyebrow>
              <h2 className="mt-6 text-[36px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[54px]">
                Tout votre mois,
                <span className="text-white/40"> d&apos;un coup d&apos;œil.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/55">
                Les dépenses qui reviennent, celles qui dérapent et ce que vous mettez de côté, au même endroit.
              </p>
            </Reveal>

            <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
              <Reveal className="lg:col-span-2">
                <BentoCard
                  title="Où part votre argent"
                  text="Revenus et dépenses mois par mois, comparés au mois précédent, avec vos catégories les plus coûteuses."
                >
                  <CashflowVisual />
                </BentoCard>
              </Reveal>
              <Reveal delay={100}>
                <BentoCard
                  title="Plafonds par catégorie"
                  text="Une alerte à 80 %, puis au dépassement. Fini les fins de mois surprises."
                >
                  <LimitsVisual />
                </BentoCard>
              </Reveal>
              <Reveal>
                <BentoCard title="Abonnements suivis" text="Chaque prélèvement rappelé le jour J. Un geste pour le valider ou l'ignorer.">
                  <SubscriptionsVisual />
                </BentoCard>
              </Reveal>
              <Reveal delay={100}>
                <BentoCard title="Objectifs d'épargne" text="Versez depuis votre budget et sachez combien mettre de côté chaque mois.">
                  <GoalVisual />
                </BentoCard>
              </Reveal>
              <Reveal delay={200}>
                <BentoCard title="Solde masqué" text="Caché par défaut, même dans le taxi-be. Un appui sur l'œil pour l'afficher.">
                  <PrivacyVisual />
                </BentoCard>
              </Reveal>
              <Reveal className="lg:col-span-3">
                <BentoCard
                  className="lg:flex-row lg:items-center lg:gap-10"
                  title="Plusieurs budgets, des rappels qui tombent juste"
                  text="Séparez personnel, foyer et épargne. Les notifications arrivent sur le téléphone même app fermée, à 9 h."
                >
                  <BudgetsVisual />
                </BentoCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Étapes */}
        <section id="etapes" className="relative scroll-mt-24 py-24 sm:py-28">
          <div aria-hidden className="absolute inset-x-0 top-0 mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="mx-auto max-w-6xl px-5">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>Comment ça marche</Eyebrow>
              <h2 className="mt-6 text-[36px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[54px]">
                Prêt en trois étapes.
              </h2>
            </Reveal>

            <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
              <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 md:block" />
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 120}>
                  <li className="relative flex flex-col items-center text-center">
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/30 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[20px] font-extrabold text-white shadow-[0_10px_40px_-8px_rgba(16,185,129,0.8)]">
                      {i + 1}
                    </span>
                    <h3 className="mt-6 text-[20px] font-bold tracking-tight">{s.title}</h3>
                    <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-white/55">{s.text}</p>
                  </li>
                </Reveal>
              ))}
            </ol>

            <Reveal className="mx-auto mt-16 flex max-w-3xl flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:flex-row sm:text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <Icon path={mdiSync} size={24} />
              </span>
              <div>
                <p className="text-[16px] font-bold">Un seul compte, partout</p>
                <p className="text-[15px] text-white/55">
                  Notez une dépense sur le téléphone, retrouvez-la sur l&apos;ordinateur : vos données suivent.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Téléchargement */}
        <section id="telecharger" className="scroll-mt-24 px-4 py-16 sm:px-6">
          <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-emerald-300/20 bg-gradient-to-br from-[#0d3b2c] via-[#062a1f] to-[#03140e] px-6 py-16 sm:px-14 sm:py-20">
            <div aria-hidden className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
            <div aria-hidden className="animate-aurora absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full bg-emerald-400/30 blur-[120px]" />
            <div className="relative flex flex-col items-center gap-12 text-center lg:flex-row lg:text-left">
              <div className="flex-1">
                <h2 className="text-[38px] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-[58px]">
                  Prenez le contrôle
                  <br />
                  <span className="text-emerald-300">dès ce mois-ci.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-white/65 lg:mx-0">
                  Installez l&apos;application Android pour recevoir vos rappels et alertes, même app fermée.
                </p>
                <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <AndroidButton className="w-full sm:w-auto" />
                  <a
                    href="/app"
                    className="inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-7 text-[15px] font-bold transition hover:bg-white/[0.08] sm:w-auto"
                  >
                    Version web
                    <Icon path={mdiArrowRight} size={18} />
                  </a>
                </div>
                <p className="mt-5 text-[13px] font-medium text-white/45">Android 7 ou plus récent · iPhone : version web</p>
              </div>

              <div className="hidden flex-col items-center gap-4 lg:flex">
                <div className="rounded-[28px] border border-white/15 bg-white/[0.06] p-4 backdrop-blur">
                  <DownloadQr href={APK_URL} size={150} />
                </div>
                <p className="text-[13px] font-semibold text-white/60">Scannez avec votre téléphone</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 py-24">
          <div className="mx-auto max-w-3xl px-5">
            <Reveal className="text-center">
              <h2 className="text-[34px] font-extrabold tracking-[-0.035em] sm:text-[44px]">Questions fréquentes</h2>
            </Reveal>
            <div className="mt-12 space-y-3">
              {FAQ.map((f, i) => (
                <Reveal key={f.q} delay={i * 60}>
                  <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-5 transition open:border-emerald-400/25 open:bg-white/[0.05]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition group-open:rotate-180 group-open:bg-emerald-400/20 group-open:text-emerald-300">
                        <Icon path={mdiChevronDown} size={20} />
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-white/60">{f.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 text-[14px] text-white/45 sm:flex-row">
          <Logo />
          <div className="flex gap-6 font-medium">
            <a href={APK_URL} download className="transition hover:text-white">Application Android</a>
            <a href="/app" className="transition hover:text-white">Version web</a>
          </div>
          <p>© {new Date().getFullYear()} Tracklyst</p>
        </div>
      </footer>
    </div>
  );
}

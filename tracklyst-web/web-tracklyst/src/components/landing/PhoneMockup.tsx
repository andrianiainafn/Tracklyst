import {
  mdiBellRingOutline,
  mdiEyeOffOutline,
  mdiFlagOutline,
  mdiGasStationOutline,
  mdiHome,
  mdiLightningBoltOutline,
  mdiPlus,
  mdiTrendingUp,
  mdiWifi,
} from "@mdi/js";
import { Icon } from "@/components/ui";

/** Écran d'accueil de l'app, version sombre (illustration, chiffres fictifs). */
function Phone() {
  const limits = [
    { name: "Essence", value: "180 000 / 250 000", ratio: 0.72, color: "#fbbf24" },
    { name: "Courses", value: "310 000 / 450 000", ratio: 0.69, color: "#34d399" },
    { name: "Petites dépenses", value: "42 000 / 120 000", ratio: 0.35, color: "#34d399" },
  ];

  return (
    <div className="relative w-[280px] rounded-[48px] bg-gradient-to-b from-white/25 to-white/5 p-[1.5px] shadow-[0_40px_120px_-20px_rgba(16,185,129,0.45)] sm:w-[300px]">
      <div className="rounded-[46px] bg-[#05080d] p-2.5">
        <div className="relative overflow-hidden rounded-[38px] bg-[#070d14] text-white">
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="h-[22px] w-[84px] rounded-full bg-black" />
            <Icon path={mdiWifi} size={14} />
          </div>

          <div className="space-y-3 px-4 pb-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-white/50">Bonjour Hery</p>
                <p className="text-[17px] font-extrabold tracking-tight">Mon Budget</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold">HR</span>
            </div>

            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#065f46] p-4">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-xl" />
              <div className="relative flex items-center justify-between text-[11px] font-semibold text-white/80">
                Solde disponible
                <Icon path={mdiEyeOffOutline} size={16} />
              </div>
              <p className="relative mt-1 text-[26px] font-extrabold tracking-tight">Ar ••••••</p>
              <div className="relative mt-3 grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="rounded-xl bg-black/15 px-2.5 py-2 backdrop-blur">
                  <p className="text-white/70">Revenus</p>
                  <p className="font-bold">+1 250 000</p>
                </div>
                <div className="rounded-xl bg-black/15 px-2.5 py-2 backdrop-blur">
                  <p className="text-white/70">Dépenses</p>
                  <p className="font-bold">−640 000</p>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.04] p-3.5">
              <p className="mb-2.5 text-[12px] font-bold">Plafonds du mois</p>
              <div className="space-y-2.5">
                {limits.map((l) => (
                  <div key={l.name}>
                    <div className="flex justify-between text-[10.5px]">
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-white/45">{l.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full" style={{ width: `${l.ratio * 100}%`, background: l.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.04] p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8b5cf6]/20 text-[#a78bfa]">
                <Icon path={mdiLightningBoltOutline} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold">Électricité</p>
                <p className="text-[10.5px] text-white/45">Prélèvement demain</p>
              </div>
              <p className="text-[12px] font-bold">85 000 Ar</p>
            </div>
          </div>

          <div className="flex items-center justify-around border-t border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-2.5 text-white/40">
            <Icon path={mdiHome} size={20} className="text-[#34d399]" />
            <Icon path={mdiTrendingUp} size={20} />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10b981] text-white shadow-lg shadow-emerald-500/40">
              <Icon path={mdiPlus} size={20} />
            </span>
            <Icon path={mdiFlagOutline} size={20} />
            <Icon path={mdiBellRingOutline} size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0b1512]/75 p-3.5 text-white shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

/** Téléphone incliné et cartes flottantes autour. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl justify-center [perspective:1600px]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-[110px]" />

      <div className="relative transition-transform duration-700 [transform:rotateX(8deg)_rotateY(-14deg)_rotateZ(2deg)] hover:[transform:rotateX(0)_rotateY(0)_rotateZ(0)]">
        <Phone />
      </div>

      {/* Alerte plafond */}
      <GlassCard className="animate-float absolute left-0 top-16 hidden w-64 sm:block md:left-6 lg:left-10">
        <div className="flex items-start gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/15 text-[#fbbf24]">
            <span className="animate-pulse-ring absolute inset-0 rounded-xl border border-[#fbbf24]/50" />
            <Icon path={mdiGasStationOutline} size={20} />
          </span>
          <div>
            <p className="text-[13px] font-bold leading-tight">Essence : 80 % du plafond</p>
            <p className="mt-1 text-[12px] leading-snug text-white/55">Il vous reste 50 000 Ar ce mois-ci.</p>
          </div>
        </div>
      </GlassCard>

      {/* Objectif */}
      <GlassCard className="animate-float-delayed absolute bottom-20 right-0 hidden w-60 sm:block md:right-6 lg:right-10">
        <div className="flex items-center gap-3.5">
          <svg viewBox="0 0 44 44" className="h-14 w-14 shrink-0 -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="#34d399"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 18 * 0.64} ${2 * Math.PI * 18}`}
            />
          </svg>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Objectif</p>
            <p className="text-[14px] font-bold">Terrain · 64 %</p>
            <p className="text-[12px] text-[#34d399]">+400 000 Ar ce mois</p>
          </div>
        </div>
      </GlassCard>

      {/* Économie du mois */}
      <GlassCard className="animate-float-delayed absolute right-2 top-6 hidden w-48 lg:block lg:right-24">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Épargné ce mois</p>
        <p className="mt-1 text-[22px] font-extrabold tracking-tight">610 000 Ar</p>
        <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34d399" stopOpacity="0.45" />
              <stop offset="1" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 26 L20 22 L40 24 L60 15 L80 17 L100 8 L120 4 L120 32 L0 32 Z" fill="url(#spark)" />
          <path d="M0 26 L20 22 L40 24 L60 15 L80 17 L100 8 L120 4" fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </GlassCard>
    </div>
  );
}

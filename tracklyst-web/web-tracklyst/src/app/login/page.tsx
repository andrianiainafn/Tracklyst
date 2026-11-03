"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Segmented } from "@/components/ui";
import { errorMessage } from "@/lib/data";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Déjà connecté → accueil.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && router.replace("/dashboard"));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (data.session) router.replace("/dashboard");
        else setInfo("Compte créé. Confirmez votre adresse e-mail puis connectez-vous.");
      }
    } catch (err) {
      setError(
        errorMessage(err, "Connexion impossible.") === "Invalid login credentials"
          ? "E-mail ou mot de passe incorrect."
          : errorMessage(err, "Connexion impossible."),
      );
    } finally {
      setLoading(false);
    }
  };

  const input =
    "h-12 w-full rounded-[14px] border border-line bg-surface px-4 text-[15px] outline-none transition placeholder:text-subtle focus:border-tint";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={72} height={72} />
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Tracklyst</h1>
          <p className="mt-1 text-sm text-muted">Budgets, plafonds, abonnements et épargne.</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "login", label: "Connexion" },
            { value: "signup", label: "Inscription" },
          ]}
        />
        {mode === "signup" && (
          <input className={input} placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        )}
        <input
          className={input}
          type="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={input}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}
        {info && <p className="rounded-[12px] bg-tint-muted px-3 py-2 text-[13px] text-ink">{info}</p>}
        <Button type="submit" loading={loading} className="mt-1">
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
        <p className="text-center text-xs text-subtle">Même compte que l&apos;application mobile.</p>
      </form>
    </main>
  );
}

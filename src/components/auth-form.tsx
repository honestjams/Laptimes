"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextRaw = params.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "confirm" ? "That confirmation link has expired or was already used. Try signing in." : null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Email not confirmed" ? "Confirm your email first. Check your inbox for the link." : "Wrong email or password.");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const username = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
      } else setSent(true);
      setBusy(false);
    }
  };

  if (sent)
    return (
      <div className="card rise mx-auto max-w-sm p-6 text-center">
        <div className="font-display text-xl font-extrabold">Check your inbox</div>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <b className="text-ink">{email}</b>. Open it on this device and you&apos;re in.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="card rise mx-auto max-w-sm space-y-4 p-6">
      <h1 className="font-display text-2xl font-extrabold">{mode === "login" ? "Sign in" : "Join the grid"}</h1>
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Driver name</label>
          <input id="name" className="field" required minLength={2} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="What the leaderboard calls you" autoComplete="nickname" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="field" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {mode === "signup" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "One sec…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={`${mode === "login" ? "/signup" : "/login"}?next=${encodeURIComponent(next)}`} className="font-bold text-accent">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

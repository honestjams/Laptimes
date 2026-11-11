"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CrewForms({ meId }: { meId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 26) || "crew";
    let slug = base;
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase.from("crews").insert({ name: name.trim(), slug, owner_id: meId }).select("id,slug").single();
      if (!error && data) {
        await supabase.from("crew_members").insert({ crew_id: data.id, profile_id: meId });
        router.push(`/crews/${data.slug}`);
        router.refresh();
        return;
      }
      if (error?.code !== "23505") {
        setError(error?.message ?? "Could not create the crew.");
        break;
      }
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    setBusy(false);
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("join_crew", { p_code: code });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push(`/crews/${data}`);
    router.refresh();
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form onSubmit={create} className="card space-y-3 p-4">
        <div className="font-bold">Start a crew</div>
        <input className="field" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Crew name" aria-label="Crew name" />
        <button className="btn btn-primary w-full" disabled={busy}>Create</button>
      </form>
      <form onSubmit={join} className="card space-y-3 p-4">
        <div className="font-bold">Join with an invite code</div>
        <input className="field font-mono" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 3fa9c21b0d" aria-label="Invite code" autoComplete="off" />
        <button className="btn btn-ghost w-full" disabled={busy}>Join</button>
      </form>
      {error && <p role="alert" className="text-sm font-semibold text-accent sm:col-span-2">{error}</p>}
    </div>
  );
}

export function CrewMemberActions({ crewId, meId, isOwner, inviteCode }: { crewId: number; meId: string; isOwner: boolean; inviteCode: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [copied, setCopied] = useState(false);
  const leave = async () => {
    if (!confirm(isOwner ? "Delete this crew for everyone?" : "Leave this crew?")) return;
    if (isOwner) await supabase.from("crews").delete().eq("id", crewId);
    else await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("profile_id", meId);
    router.push("/crews");
    router.refresh();
  };
  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      {inviteCode && (
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-muted">Invite code. Share it with your mates.</div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-lg font-bold">{inviteCode}</code>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(inviteCode).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={leave}>{isOwner ? "Delete crew" : "Leave crew"}</button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { refreshData } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

export function ResolveReport({ id }: { id: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  return (
    <button className="btn btn-ghost btn-sm" onClick={async () => (await supabase.from("reports").update({ resolved: true }).eq("id", id), router.refresh())}>
      Mark dealt with
    </button>
  );
}

export function ResolveClaim({ id }: { id: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [err, setErr] = useState<string | null>(null);
  const go = async (approve: boolean) => {
    if (approve && !confirm("Move all of this driver's laps to the person asking? This can't be undone.")) return;
    const { error } = await supabase.rpc("resolve_claim", { p_request_id: id, p_approve: approve });
    if (error) return setErr(error.message);
    await refreshData("laps", "profiles");
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn btn-primary btn-sm" onClick={() => go(true)}>Approve</button>
      <button className="btn btn-ghost btn-sm" onClick={() => go(false)}>Reject</button>
      {err && <span className="text-xs font-semibold text-accent">{err}</span>}
    </div>
  );
}

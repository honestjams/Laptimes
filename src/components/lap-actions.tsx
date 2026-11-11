"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EyeOff, Flag, Trash2 } from "lucide-react";
import { refreshData } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

export function LapActions({ lapId, storagePaths, meId, isOwner, isAdmin, isHidden, backHref }: { lapId: number; storagePaths: string[]; meId: string | null; isOwner: boolean; isAdmin: boolean; isHidden: boolean; backHref: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const del = async () => {
    if (!confirm("Delete this lap for good?")) return;
    if (isOwner && storagePaths.length) await supabase.storage.from("lap-files").remove(storagePaths);
    const { error } = await supabase.from("laps").delete().eq("id", lapId);
    if (error) return setMsg(error.message);
    await refreshData("laps");
    router.push(backHref);
    router.refresh();
  };
  const hide = async () => {
    const { error } = await supabase.from("laps").update({ is_hidden: !isHidden }).eq("id", lapId);
    if (error) return setMsg(error.message);
    await refreshData("laps");
    router.refresh();
  };
  const report = async () => {
    const { error } = await supabase.from("reports").insert({ lap_id: lapId, reporter_id: meId, reason: reason.trim() });
    setMsg(error ? (error.code === "23505" ? "You've already reported this lap." : error.message) : "Thanks. An admin will take a look.");
    setReporting(false);
  };

  if (!meId) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!isOwner && (
          <button className="btn btn-ghost btn-sm" onClick={() => setReporting((r) => !r)}>
            <Flag size={15} /> Report
          </button>
        )}
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={hide}>
            <EyeOff size={15} /> {isHidden ? "Unhide" : "Hide from leaderboards"}
          </button>
        )}
        {(isOwner || isAdmin) && (
          <button className="btn btn-ghost btn-sm" onClick={del}>
            <Trash2 size={15} /> Delete lap
          </button>
        )}
      </div>
      {reporting && (
        <div className="card rise space-y-2 p-3">
          <label className="label" htmlFor="reason">What looks wrong?</label>
          <input id="reason" className="field" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. time isn't possible in this car" />
          <button className="btn btn-primary btn-sm" disabled={reason.trim().length < 3} onClick={report}>Send report</button>
        </div>
      )}
      {msg && <p role="status" className="text-sm font-semibold text-muted">{msg}</p>}
    </div>
  );
}

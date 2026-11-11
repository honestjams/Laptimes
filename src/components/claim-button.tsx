"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ClaimButton({ placeholderId, meId, name }: { placeholderId: string; meId: string; name: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<string | null>(null);
  const claim = async () => {
    const { error } = await supabase.from("claim_requests").insert({ placeholder_id: placeholderId, claimant_id: meId });
    setMsg(error ? (error.code === "23505" ? "You've already asked. An admin will sort it out." : error.message) : "Request sent. Once an admin approves it, these laps move to your profile.");
  };
  if (msg) return <p className="text-sm font-semibold text-muted">{msg}</p>;
  return (
    <button className="btn btn-primary btn-sm" onClick={claim}>
      I&apos;m {name}, these are my laps
    </button>
  );
}

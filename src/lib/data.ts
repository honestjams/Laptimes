import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ComboRecord, LapFull, LapStatus, Profile } from "@/lib/types";

export const DRIVER = "driver:profiles(id,username,display_name,is_placeholder)";
export const LAP_FULL = `*, ${DRIVER}, track:tracks(*), car:cars(*)`;

/** The signed-in user's profile, or null. Deduped per request. */
export const getMe = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (profile as Profile) ?? null;
});

export async function getComboRecords(): Promise<ComboRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("combo_records")
    .select(`*, ${DRIVER}, track:tracks(*), car:cars(*)`)
    .order("time_ms");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ComboRecord[];
}

/** Works out the chip colour for a list of laps (record / PB / slower). */
export async function getLapStatuses(laps: { id: number }[]): Promise<Map<number, LapStatus>> {
  const map = new Map<number, LapStatus>();
  const ids = laps.map((l) => l.id);
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const [records, bests] = await Promise.all([
    supabase.from("combo_records").select("lap_id").in("lap_id", ids),
    supabase.from("best_laps").select("id").in("id", ids),
  ]);
  const rec = new Set((records.data ?? []).map((r) => r.lap_id as number));
  const pb = new Set((bests.data ?? []).map((r) => r.id as number));
  for (const id of ids) map.set(id, rec.has(id) ? "record" : pb.has(id) ? "pb" : "slow");
  return map;
}

export async function getRecentLaps(limit = 12): Promise<LapFull[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("laps")
    .select(LAP_FULL)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as LapFull[];
}

/** Crews the signed-in user belongs to, with member ids (for leaderboard filters). */
export async function getMyCrews(meId: string | undefined) {
  if (!meId) return [];
  const supabase = await createClient();
  const { data: mine } = await supabase.from("crew_members").select("crew_id").eq("profile_id", meId);
  const crewIds = (mine ?? []).map((m) => m.crew_id as number);
  if (crewIds.length === 0) return [];
  const [{ data: crews }, { data: members }] = await Promise.all([
    supabase.from("crews").select("id,slug,name").in("id", crewIds),
    supabase.from("crew_members").select("crew_id,profile_id").in("crew_id", crewIds),
  ]);
  return (crews ?? []).map((c) => ({
    id: c.id as number,
    slug: c.slug as string,
    name: c.name as string,
    memberIds: (members ?? []).filter((m) => m.crew_id === c.id).map((m) => m.profile_id as string),
  }));
}
export type MyCrew = Awaited<ReturnType<typeof getMyCrews>>[number];

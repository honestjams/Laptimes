import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Car, ComboRecord, DriverLite, Lap, LapFull, LapStatus, Profile, Sim, Track } from "@/lib/types";

export const DRIVER = "driver:profiles(id,username,display_name,is_placeholder)";
export const LAP_FULL = `*, ${DRIVER}, track:tracks(*), car:cars(*)`;

/* ------------------------------------------------------------------ */
/* Per-user data (reads the session cookie, never cached)              */
/* ------------------------------------------------------------------ */

/** The signed-in user's profile, or null. Deduped per request. */
export const getMe = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (profile as Profile) ?? null;
});

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

/* ------------------------------------------------------------------ */
/* Public data                                                         */
/* Read with a cookie-less client (so it only ever sees what a signed- */
/* out visitor may see) and cached on the server. Pages render from    */
/* the cache instead of waiting on the database. Anything that changes */
/* data calls refreshData() (src/app/actions.ts) to clear the matching */
/* tag; the 60 second revalidate is only a backstop.                   */
/* ------------------------------------------------------------------ */

export type Tag = "laps" | "catalog" | "profiles";

const pub = () =>
  createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function cached<A extends unknown[], R>(key: string, tags: Tag[], fn: (...args: A) => Promise<R>) {
  return unstable_cache(fn, [key], { tags, revalidate: 60 });
}

export const getComboRecords = cached("combo-records", ["laps", "catalog", "profiles"], async (): Promise<ComboRecord[]> => {
  const { data, error } = await pub().from("combo_records").select(`*, ${DRIVER}, track:tracks(*), car:cars(*)`).order("time_ms");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ComboRecord[];
});

export const getCatalog = cached("catalog", ["catalog"], async () => {
  const db = pub();
  const [{ data: sims }, { data: tracks }, { data: cars }] = await Promise.all([
    db.from("sims").select("*").order("sort"),
    db.from("tracks").select("*").order("name").limit(5000),
    db.from("cars").select("*").order("name").limit(5000),
  ]);
  return { sims: (sims ?? []) as Sim[], tracks: (tracks ?? []) as Track[], cars: (cars ?? []) as Car[] };
});

async function statusesFor(ids: number[]): Promise<Record<number, LapStatus>> {
  const out: Record<number, LapStatus> = {};
  if (ids.length === 0) return out;
  const db = pub();
  const [records, bests] = await Promise.all([
    db.from("combo_records").select("lap_id").in("lap_id", ids),
    db.from("best_laps").select("id").in("id", ids),
  ]);
  const rec = new Set((records.data ?? []).map((r) => r.lap_id as number));
  const pb = new Set((bests.data ?? []).map((r) => r.id as number));
  for (const id of ids) out[id] = rec.has(id) ? "record" : pb.has(id) ? "pb" : "slow";
  return out;
}

/** Works out the chip colour for one lap (record / PB / slower). */
export async function getLapStatus(lapId: number): Promise<LapStatus> {
  return (await statusesFor([lapId]))[lapId] ?? "slow";
}

export const getHomeData = cached("home", ["laps", "catalog", "profiles"], async () => {
  const db = pub();
  const [{ data: recent }, lapCount, driverCount] = await Promise.all([
    db.from("laps").select(LAP_FULL).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(10),
    db.from("laps").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const laps = (recent ?? []) as unknown as LapFull[];
  return { laps, statuses: await statusesFor(laps.map((l) => l.id)), lapCount: lapCount.count ?? 0, driverCount: driverCount.count ?? 0 };
});

export const getComboData = cached("combo", ["laps", "catalog", "profiles"], async (trackId: number, carId: number) => {
  const db = pub();
  const [{ data: track }, { data: car }, { data: laps }] = await Promise.all([
    db.from("tracks").select("*").eq("id", trackId).maybeSingle(),
    db.from("cars").select("*").eq("id", carId).maybeSingle(),
    db.from("laps").select(`*, ${DRIVER}`).eq("track_id", trackId).eq("car_id", carId).order("time_ms").order("created_at").limit(2000),
  ]);
  return { track: track as Track | null, car: car as Car | null, laps: (laps ?? []) as unknown as (Lap & { driver: DriverLite })[] };
});

export type EntityBest = Lap & { driver: DriverLite; track: Pick<Track, "name" | "layout">; car: Pick<Car, "name" | "image_url"> };
export const getEntityData = cached("entity", ["laps", "catalog", "profiles"], async (kind: "track" | "car", id: number) => {
  const db = pub();
  const col = kind === "track" ? "track_id" : "car_id";
  const [{ data: entity }, { data: recs }, { data: bests }] = await Promise.all([
    db.from(`${kind}s`).select("*").eq("id", id).maybeSingle(),
    db.from("combo_records").select(`*, ${DRIVER}, track:tracks(*), car:cars(*)`).eq(col, id).order("time_ms"),
    db.from("best_laps").select(`*, ${DRIVER}, track:tracks(name,layout), car:cars(name,image_url)`).eq(col, id).order("time_ms").limit(2000),
  ]);
  return { entity: entity as Track | Car | null, records: (recs ?? []) as unknown as ComboRecord[], bests: (bests ?? []) as unknown as EntityBest[] };
});

export const getDriverData = cached("driver", ["laps", "catalog", "profiles"], async (username: string) => {
  const db = pub();
  const { data: p } = await db.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!p) return null;
  const [{ data: laps }, { data: recs }] = await Promise.all([
    db.from("laps").select(LAP_FULL).eq("driver_id", p.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(3000),
    db.from("combo_records").select("lap_id,driver_count").eq("driver_id", p.id),
  ]);
  return {
    driver: p as Profile,
    laps: (laps ?? []) as unknown as LapFull[],
    records: (recs ?? []) as { lap_id: number; driver_count: number }[],
  };
});

export const getDrivers = cached("drivers", ["laps", "profiles"], async () => {
  const db = pub();
  const [{ data: profiles }, { data: bests }] = await Promise.all([
    db.from("profiles").select("id,username,display_name,is_placeholder").order("display_name").limit(5000),
    db.from("best_laps").select("driver_id").limit(20000),
  ]);
  const combos: Record<string, number> = {};
  for (const b of bests ?? []) combos[b.driver_id as string] = (combos[b.driver_id as string] ?? 0) + 1;
  return ((profiles ?? []) as DriverLite[]).map((p) => ({ ...p, combos: combos[p.id] ?? 0 }));
});

export type H2HBest = Lap & { track: Pick<Track, "name" | "layout" | "image_url">; car: Pick<Car, "name"> };
export const getH2H = cached("h2h", ["laps", "catalog"], async (aId: string, bId: string) => {
  const { data } = await pub().from("best_laps").select("*, track:tracks(name,layout,image_url), car:cars(name)").in("driver_id", [aId, bId]).limit(10000);
  return (data ?? []) as unknown as H2HBest[];
});

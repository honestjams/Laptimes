import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Leaderboard } from "@/components/leaderboard";
import { Legend, PageHeader } from "@/components/ui";
import { DRIVER, getMe, getMyCrews } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackLabel } from "@/lib/time";
import type { Car, DriverLite, Lap, Track } from "@/lib/types";

export default async function ComboPage({ params }: PageProps<"/combo/[trackId]/[carId]">) {
  const { trackId, carId } = await params;
  const tid = Number(trackId);
  const cid = Number(carId);
  if (!Number.isInteger(tid) || !Number.isInteger(cid)) notFound();

  const supabase = await createClient();
  const me = await getMe();
  const [{ data: track }, { data: car }, { data: laps }, crews] = await Promise.all([
    supabase.from("tracks").select("*").eq("id", tid).maybeSingle(),
    supabase.from("cars").select("*").eq("id", cid).maybeSingle(),
    supabase.from("laps").select(`*, ${DRIVER}`).eq("track_id", tid).eq("car_id", cid).eq("is_hidden", false).order("time_ms").order("created_at").limit(2000),
    getMyCrews(me?.id),
  ]);
  if (!track || !car) notFound();
  const t = track as Track;
  const c = car as Car;

  return (
    <>
      <PageHeader eyebrow="Leaderboard" title={trackLabel(t)}>
        <Link href={`/log?track=${t.id}&car=${c.id}`} className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={3} /> Log a lap here
        </Link>
      </PageHeader>
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/cars/${c.id}`} className="font-bold hover:text-accent">
          {c.name}
        </Link>
        {c.class && <span className="tag">{c.class}</span>}
        <span className="text-muted">·</span>
        <Link href={`/tracks/${t.id}`} className="text-muted hover:text-ink">
          All cars at this track
        </Link>
      </div>
      <Leaderboard laps={(laps ?? []) as unknown as (Lap & { driver: DriverLite })[]} meId={me?.id ?? null} crews={crews} />
      <div className="mt-4">
        <Legend />
      </div>
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/combo/[trackId]/[carId]">) {
  const { trackId, carId } = await params;
  const supabase = await createClient();
  const [{ data: t }, { data: c }] = await Promise.all([
    supabase.from("tracks").select("name,layout").eq("id", Number(trackId) || 0).maybeSingle(),
    supabase.from("cars").select("name").eq("id", Number(carId) || 0).maybeSingle(),
  ]);
  return { title: t && c ? `${trackLabel(t)} · ${c.name}` : "Leaderboard" };
}

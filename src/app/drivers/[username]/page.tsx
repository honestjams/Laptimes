import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { ClaimButton } from "@/components/claim-button";
import { Coverage, type Cell } from "@/components/coverage";
import { LapRow } from "@/components/lap-row";
import { ProfileCharts, type ChartLap } from "@/components/profile-charts";
import { Legend, PageHeader, Stat } from "@/components/ui";
import { getMe, LAP_FULL } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackLabel } from "@/lib/time";
import type { LapFull, LapStatus, Profile } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/drivers/[username]">) {
  return { title: decodeURIComponent((await params).username) };
}

export default async function DriverPage({ params }: PageProps<"/drivers/[username]">) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("*").eq("username", decodeURIComponent(username).toLowerCase()).maybeSingle();
  if (!p) notFound();
  const driver = p as Profile;
  const me = await getMe();

  const [{ data: lapData }, { data: recs }] = await Promise.all([
    supabase.from("laps").select(LAP_FULL).eq("driver_id", driver.id).eq("is_hidden", false).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(3000),
    supabase.from("combo_records").select("lap_id,driver_count").eq("driver_id", driver.id),
  ]);
  const laps = (lapData ?? []) as unknown as LapFull[];
  const recordIds = new Set((recs ?? []).map((r) => r.lap_id as number));
  const contested = (recs ?? []).filter((r) => (r.driver_count as number) > 1).length;

  // best lap per combo
  const best = new Map<string, LapFull>();
  for (const l of laps) {
    const k = `${l.track_id}-${l.car_id}`;
    const b = best.get(k);
    if (!b || l.time_ms < b.time_ms) best.set(k, l);
  }
  const bestIds = new Set([...best.values()].map((l) => l.id));
  const status = (l: LapFull): LapStatus => (recordIds.has(l.id) ? "record" : bestIds.has(l.id) ? "pb" : "slow");

  const chartLaps: ChartLap[] = laps.map((l) => ({ id: l.id, time_ms: l.time_ms, at: l.set_on ?? l.created_at, dated: !!l.set_on, combo: `${l.track_id}-${l.car_id}`, comboLabel: `${trackLabel(l.track)} · ${l.car.name}` }));
  const cells: Cell[] = [...best.values()].map((l) => ({ trackId: l.track_id, carId: l.car_id, time_ms: l.time_ms, record: recordIds.has(l.id) }));
  const uniq = <T extends { id: number; label: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.id, x])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const tracks = uniq([...best.values()].map((l) => ({ id: l.track_id, label: trackLabel(l.track) })));
  const cars = uniq([...best.values()].map((l) => ({ id: l.car_id, label: l.car.name })));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={driver.is_placeholder ? "Imported driver, not yet claimed" : `@${driver.username}`} title={driver.display_name}>
        {me && me.id !== driver.id && (
          <Link href={`/h2h?a=${me.username}&b=${driver.username}`} className="btn btn-ghost btn-sm">
            <Swords size={15} /> Head to head
          </Link>
        )}
        {driver.is_placeholder && me && <ClaimButton placeholderId={driver.id} meId={me.id} name={driver.display_name} />}
      </PageHeader>
      {driver.bio && <p className="-mt-3 max-w-prose text-muted">{driver.bio}</p>}
      {driver.is_placeholder && !me && (
        <p className="-mt-3 text-sm text-muted">
          Is this you? <Link href={`/signup?next=/drivers/${driver.username}`} className="font-bold text-accent">Sign up</Link> to claim these laps.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Laps logged" value={laps.length} />
        <Stat label="Combos driven" value={best.size} tone="pb" />
        <Stat label="Records held" value={recordIds.size} tone="record" />
        <Stat label="Records won against a rival" value={contested} tone="accent" />
      </div>

      {laps.length > 0 && (
        <>
          <ProfileCharts laps={chartLaps} />
          <Coverage tracks={tracks} cars={cars} cells={cells} />
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Laps</h2>
              <Legend />
            </div>
            <ul className="card divide-y divide-line">
              {laps.slice(0, 100).map((l) => (
                <LapRow key={l.id} lap={l} status={status(l)} showDriver={false} />
              ))}
            </ul>
            {laps.length > 100 && <p className="mt-2 text-xs text-muted">Showing the latest 100 of {laps.length} laps.</p>}
          </section>
        </>
      )}
      {laps.length === 0 && <div className="card p-8 text-center text-sm text-muted">No laps logged yet.</div>}
    </div>
  );
}

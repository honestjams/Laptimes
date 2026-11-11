import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { ClaimButton } from "@/components/claim-button";
import { Coverage, type Cell } from "@/components/coverage";
import { LapRow } from "@/components/lap-row";
import { Avatar } from "@/components/media";
import { ProfileCharts } from "@/components/profile-charts-lazy";
import type { ChartLap } from "@/components/profile-charts";
import { Legend, Stat } from "@/components/ui";
import { getDriverData, getMe } from "@/lib/data";
import { trackLabel } from "@/lib/time";
import type { LapFull, LapStatus } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/drivers/[username]">) {
  return { title: decodeURIComponent((await params).username) };
}

export default async function DriverPage({ params }: PageProps<"/drivers/[username]">) {
  const { username } = await params;
  const [data, me] = await Promise.all([getDriverData(decodeURIComponent(username).toLowerCase()), getMe()]);
  if (!data) notFound();
  const { driver, laps } = data;
  const recordIds = new Set(data.records.map((r) => r.lap_id));
  const contested = data.records.filter((r) => r.driver_count > 1).length;

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
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={driver.display_name} seed={driver.username} size={64} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">{driver.is_placeholder ? "Imported driver, not yet claimed" : `@${driver.username}`}</div>
          <h1 className="truncate font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{driver.display_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {me && me.id !== driver.id && (
            <Link href={`/h2h?a=${me.username}&b=${driver.username}`} className="btn btn-ghost btn-sm">
              <Swords size={15} /> Head to head
            </Link>
          )}
          {driver.is_placeholder && me && <ClaimButton placeholderId={driver.id} meId={me.id} name={driver.display_name} />}
        </div>
      </div>
      {driver.bio && <p className="max-w-prose text-muted">{driver.bio}</p>}
      {driver.is_placeholder && !me && (
        <p className="text-sm text-muted">
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

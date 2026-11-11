import Link from "next/link";
import { ArrowRight, Crown, Plus } from "lucide-react";
import { CatalogCard } from "@/components/catalog-card";
import { LapRow } from "@/components/lap-row";
import { Avatar, CarPhoto, TrackMap } from "@/components/media";
import { DriverLink, Legend, Stat, TimeChip } from "@/components/ui";
import { getComboRecords, getHomeData } from "@/lib/data";
import { trackLabel } from "@/lib/time";
import type { ComboRecord } from "@/lib/types";

export default async function Home() {
  const [records, home] = await Promise.all([getComboRecords(), getHomeData()]);

  // "Who is the king": records held in combos where at least two drivers have set a time.
  const contested = records.filter((r) => r.driver_count > 1);
  const crowns = new Map<string, { driver: ComboRecord["driver"]; n: number }>();
  for (const r of contested) {
    const c = crowns.get(r.driver_id) ?? { driver: r.driver, n: 0 };
    c.n++;
    crowns.set(r.driver_id, c);
  }
  const kings = [...crowns.values()].sort((a, b) => b.n - a.n).slice(0, 5);

  // Busiest tracks: most combos, with the outright fastest lap there.
  const byTrack = new Map<number, { rec: ComboRecord; cars: number }>();
  for (const r of records) {
    const t = byTrack.get(r.track_id);
    if (!t) byTrack.set(r.track_id, { rec: r, cars: 1 });
    else {
      t.cars++;
      if (r.time_ms < t.rec.time_ms) t.rec = r;
    }
  }
  const tracks = [...byTrack.values()].sort((a, b) => b.cars - a.cars).slice(0, 6);
  // The closest fight on the site makes the hero picture.
  const spotlight = contested.find((r) => r.track.image_url && r.car.image_url) ?? records.find((r) => r.track.image_url && r.car.image_url);

  return (
    <div className="space-y-8">
      <section className="card relative grid overflow-hidden lg:grid-cols-5">
        <div className="p-6 sm:p-10 lg:col-span-3">
          <div className="eyebrow mb-3">Sim racing lap times</div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Go <span className="text-record">purple</span>.
            <br />
            Rub it in.
          </h1>
          <p className="mt-4 max-w-md text-muted">Log a lap in ten seconds, see exactly how far off the record you are, and grab the ghost of the lap you&apos;re chasing.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/log" className="btn btn-primary">
              <Plus size={18} strokeWidth={3} /> Log a lap
            </Link>
            <Link href="/leaderboards" className="btn btn-ghost">
              Leaderboards <ArrowRight size={16} />
            </Link>
          </div>
          <div className="kerb mt-8" />
        </div>
        {spotlight && (
          <Link href={`/combo/${spotlight.track_id}/${spotlight.car_id}`} className="group relative block min-h-56 border-t border-line lg:col-span-2 lg:border-l lg:border-t-0">
            <CarPhoto car={spotlight.car} sizes="(min-width: 1024px) 420px, 100vw" eager className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <TrackMap track={spotlight.track} sizes="128px" eager className="absolute right-3 top-3 h-20 w-28 rounded-xl shadow-card" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-80">Record to beat</div>
              <div className="truncate font-display text-lg font-extrabold">{trackLabel(spotlight.track)}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm opacity-90">{spotlight.car.name} · {spotlight.driver.display_name}</span>
                <TimeChip ms={spotlight.time_ms} status="record" />
              </div>
            </div>
          </Link>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Laps logged" value={home.lapCount} />
        <Stat label="Track and car combos" value={records.length} tone="record" />
        <Stat label="Drivers" value={home.driverCount} tone="accent" />
      </section>

      {tracks.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-lg font-bold">Busiest tracks</h2>
            <Link href="/tracks" className="text-sm font-bold text-accent">All tracks</Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {tracks.map(({ rec, cars }, i) => (
              <div key={rec.track_id} className="w-64 shrink-0 snap-start sm:w-auto">
                <CatalogCard kind="track" id={rec.track_id} name={trackLabel(rec.track)} image_url={rec.track.image_url} sub={rec.track.country} best={rec.time_ms} footer={`${cars} ${cars === 1 ? "car" : "cars"} · fastest in the ${rec.car.name}`} eager={i < 3} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="min-w-0 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Latest laps</h2>
            <Legend />
          </div>
          <ul className="card divide-y divide-line">
            {home.laps.map((lap) => (
              <LapRow key={lap.id} lap={lap} status={home.statuses[lap.id] ?? "slow"} />
            ))}
            {home.laps.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps yet. Be the first.</li>}
          </ul>
        </section>

        <section className="min-w-0 space-y-8 lg:col-span-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <Crown size={18} className="text-record" /> Who is the king?
            </h2>
            <ol className="card divide-y divide-line">
              {kings.map((k, i) => (
                <li key={k.driver.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 font-mono text-sm font-bold text-muted">{i + 1}</span>
                  <Avatar name={k.driver.display_name} seed={k.driver.username} size={32} />
                  <DriverLink d={k.driver} className="min-w-0 flex-1 truncate" />
                  <span className="font-mono text-sm font-bold text-record">{k.n}</span>
                  <span className="text-xs text-muted">records</span>
                </li>
              ))}
              {kings.length === 0 && <li className="p-6 text-center text-sm text-muted">No contested records yet.</li>}
            </ol>
            <p className="mt-2 text-xs text-muted">Counts combos where at least two drivers have set a time.</p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold">Records to chase</h2>
            <ul className="card divide-y divide-line">
              {records
                .filter((r) => r.driver_count === 1)
                .slice(0, 5)
                .map((r) => (
                  <li key={`${r.track_id}-${r.car_id}`}>
                    <Link href={`/combo/${r.track_id}/${r.car_id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                      <TrackMap track={r.track} sizes="64px" className="h-11 w-16 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{trackLabel(r.track)}</div>
                        <div className="truncate text-xs text-muted">{r.car.name} · only {r.driver.display_name} so far</div>
                      </div>
                      <TimeChip ms={r.time_ms} status="record" size="sm" />
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

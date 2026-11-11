import Link from "next/link";
import { ArrowRight, Crown, Plus } from "lucide-react";
import { LapRow } from "@/components/lap-row";
import { DriverLink, Legend, Stat, TimeChip } from "@/components/ui";
import { getComboRecords, getLapStatuses, getMe, getRecentLaps } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackLabel } from "@/lib/time";

export default async function Home() {
  const supabase = await createClient();
  const [me, records, recent, lapCount, driverCount] = await Promise.all([
    getMe(),
    getComboRecords(),
    getRecentLaps(10),
    supabase.from("laps").select("id", { count: "exact", head: true }).eq("is_hidden", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const statuses = await getLapStatuses(recent);

  // "Who is the king": records held in combos where at least two drivers have set a time.
  const contested = records.filter((r) => r.driver_count > 1);
  const crowns = new Map<string, { driver: (typeof records)[number]["driver"]; n: number }>();
  for (const r of contested) {
    const c = crowns.get(r.driver_id) ?? { driver: r.driver, n: 0 };
    c.n++;
    crowns.set(r.driver_id, c);
  }
  const kings = [...crowns.values()].sort((a, b) => b.n - a.n).slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="eyebrow mb-3">Sim racing lap times</div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Go <span className="text-record">purple</span>.
          <br />
          Rub it in.
        </h1>
        <p className="mt-4 max-w-md text-muted">
          Log a lap in ten seconds, see exactly how far off the record you are, and grab the ghost of the lap you&apos;re chasing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={me ? "/log" : "/signup"} className="btn btn-primary">
            <Plus size={18} strokeWidth={3} /> {me ? "Log a lap" : "Sign up and log a lap"}
          </Link>
          <Link href="/leaderboards" className="btn btn-ghost">
            Leaderboards <ArrowRight size={16} />
          </Link>
        </div>
        <div className="kerb mt-8" />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Laps logged" value={lapCount.count ?? 0} />
        <Stat label="Track and car combos" value={records.length} tone="record" />
        <Stat label="Drivers" value={driverCount.count ?? 0} tone="accent" />
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="min-w-0 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Latest laps</h2>
            <Legend />
          </div>
          <ul className="card divide-y divide-line">
            {recent.map((lap) => (
              <LapRow key={lap.id} lap={lap} status={statuses.get(lap.id) ?? "slow"} />
            ))}
            {recent.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps yet. Be the first.</li>}
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
                  <DriverLink d={k.driver} className="flex-1" />
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
                  <li key={`${r.track_id}-${r.car_id}`} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/combo/${r.track_id}/${r.car_id}`} className="min-w-0 flex-1 hover:text-accent">
                      <div className="truncate text-sm font-bold">{trackLabel(r.track)}</div>
                      <div className="truncate text-xs text-muted">{r.car.name} · only {r.driver.display_name} so far</div>
                    </Link>
                    <TimeChip ms={r.time_ms} status="record" size="sm" />
                  </li>
                ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

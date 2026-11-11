import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { CrewMemberActions } from "@/components/crew-forms";
import { DriverLink, PageHeader, TimeChip } from "@/components/ui";
import { DRIVER, getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackLabel } from "@/lib/time";
import type { Car, Crew, DriverLite, Lap, Track } from "@/lib/types";

type Best = Lap & { driver: DriverLite; track: Pick<Track, "name" | "layout">; car: Pick<Car, "name"> };

export default async function CrewPage({ params }: PageProps<"/crews/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const me = await getMe();
  const { data: c } = await supabase.from("crews").select("id,slug,name,owner_id,created_at").eq("slug", decodeURIComponent(slug).toLowerCase()).maybeSingle();
  if (!c) notFound();
  const crew = c as Crew;
  const { data: mem } = await supabase.from("crew_members").select(`profile_id, ${DRIVER}`).eq("crew_id", crew.id);
  const members = ((mem ?? []) as unknown as { profile_id: string; driver: DriverLite }[]).map((m) => m.driver);
  const ids = members.map((m) => m.id);
  const isMember = !!me && ids.includes(me.id);

  const [{ data: bests }, code] = await Promise.all([
    ids.length ? supabase.from("best_laps").select(`*, ${DRIVER}, track:tracks(name,layout), car:cars(name)`).in("driver_id", ids).order("time_ms").limit(10000) : Promise.resolve({ data: [] }),
    isMember ? supabase.rpc("crew_invite_code", { p_crew_id: crew.id }) : Promise.resolve({ data: null }),
  ]);

  // crew record per combo = fastest member lap
  const combos = new Map<string, { best: Best; drivers: number }>();
  for (const l of (bests ?? []) as unknown as Best[]) {
    const k = `${l.track_id}-${l.car_id}`;
    const e = combos.get(k);
    if (e) e.drivers++;
    else combos.set(k, { best: l, drivers: 1 });
  }
  const list = [...combos.values()].sort((a, b) => trackLabel(a.best.track).localeCompare(trackLabel(b.best.track)) || a.best.time_ms - b.best.time_ms);
  const crowns = new Map<string, number>();
  for (const e of list) if (e.drivers > 1) crowns.set(e.best.driver_id, (crowns.get(e.best.driver_id) ?? 0) + 1);
  const table = members.map((m) => ({ m, n: crowns.get(m.id) ?? 0 })).sort((a, b) => b.n - a.n || a.m.display_name.localeCompare(b.m.display_name));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Crew" title={crew.name} />
      {isMember && <CrewMemberActions crewId={crew.id} meId={me!.id} isOwner={crew.owner_id === me!.id} inviteCode={(code.data as string | null) ?? null} />}

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Crown size={18} className="text-record" /> Who is the king?</h2>
          <ol className="card divide-y divide-line">
            {table.map((r, i) => (
              <li key={r.m.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-5 text-center font-display text-sm font-extrabold ${i === 0 && r.n > 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                <DriverLink d={r.m} className="flex-1" />
                <span className="font-mono text-sm font-bold text-record">{r.n}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Crew records held, counting combos at least two members have driven.</p>
        </section>
        <section className="lg:col-span-3">
          <h2 className="mb-3 font-display text-lg font-bold">Crew records</h2>
          <ul className="card divide-y divide-line">
            {list.map((e) => (
              <li key={e.best.id}>
                <Link href={`/combo/${e.best.track_id}/${e.best.car_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{trackLabel(e.best.track)}</div>
                    <div className="truncate text-xs text-muted">{e.best.car.name} · {e.best.driver.display_name} · {e.drivers} {e.drivers === 1 ? "member" : "members"}</div>
                  </div>
                  <TimeChip ms={e.best.time_ms} status="record" />
                </Link>
              </li>
            ))}
            {list.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps from this crew yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

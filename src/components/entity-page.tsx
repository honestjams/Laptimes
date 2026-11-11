import Link from "next/link";
import { ExternalLink, FolderOpen } from "lucide-react";
import { DriverLink, PageHeader, TimeChip, Verified } from "@/components/ui";
import { DRIVER } from "@/lib/data";
import { EntityEdit } from "@/components/entity-edit";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackLabel } from "@/lib/time";
import type { Car, ComboRecord, DriverLite, Lap, Track } from "@/lib/types";

/** Shared page for one track (all cars) or one car (all tracks). */
export async function EntityPage({ kind, entity }: { kind: "track" | "car"; entity: Track | Car }) {
  const supabase = await createClient();
  const me = await getMe();
  const canEdit = !!me && (me.is_admin || me.id === entity.created_by);
  const col = kind === "track" ? "track_id" : "car_id";
  const [{ data: recs }, { data: bests }] = await Promise.all([
    supabase.from("combo_records").select(`*, ${DRIVER}, track:tracks(*), car:cars(*)`).eq(col, entity.id).order("time_ms"),
    supabase.from("best_laps").select(`*, ${DRIVER}, track:tracks(name,layout), car:cars(name)`).eq(col, entity.id).order("time_ms").limit(2000),
  ]);
  const records = (recs ?? []) as unknown as ComboRecord[];
  type Best = Lap & { driver: DriverLite; track: Pick<Track, "name" | "layout">; car: Pick<Car, "name"> };

  // For a track, "fastest overall" is each driver's quickest lap in any car.
  const overall: Best[] = [];
  const seen = new Set<string>();
  for (const b of (bests ?? []) as unknown as Best[]) {
    if (seen.has(b.driver_id)) continue;
    seen.add(b.driver_id);
    overall.push(b);
  }

  const title = kind === "track" ? trackLabel(entity as Track) : entity.name;
  const sub =
    kind === "track"
      ? [(entity as Track).country, (entity as Track).length_m ? `${((entity as Track).length_m! / 1000).toFixed(2)} km` : null]
      : [(entity as Car).brand, (entity as Car).class];
  const folder = kind === "track" ? [(entity as Track).ac_folder, (entity as Track).ac_layout].filter(Boolean).join(" / ") : (entity as Car).ac_folder;

  return (
    <>
      <PageHeader eyebrow={kind === "track" ? "Track" : "Car"} title={title} />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        {sub.filter(Boolean).map((s) => (
          <span key={s} className="tag">{s}</span>
        ))}
        {entity.is_mod && <span className="tag">Mod</span>}
        {folder && (
          <span className="tag font-mono" title="Assetto Corsa folder name">
            <FolderOpen size={12} /> {folder}
          </span>
        )}
        {entity.download_url && (
          <a href={entity.download_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
            Get the mod <ExternalLink size={13} />
          </a>
        )}
      </div>

      {canEdit && (
        <EntityEdit
          kind={kind}
          id={entity.id}
          folder={entity.ac_folder ?? ""}
          layoutFolder={kind === "track" ? ((entity as Track).ac_layout ?? "") : ""}
          url={entity.download_url ?? ""}
          cls={kind === "car" ? ((entity as Car).class ?? "") : ""}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{kind === "track" ? "Records by car" : "Records by track"}</h2>
          <ul className="card divide-y divide-line">
            {records.map((r) => (
              <li key={`${r.track_id}-${r.car_id}`}>
                <Link href={`/combo/${r.track_id}/${r.car_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{kind === "track" ? r.car.name : trackLabel(r.track)}</div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      {r.driver.display_name} <Verified on={r.is_verified} /> · {r.driver_count} {r.driver_count === 1 ? "driver" : "drivers"}
                    </div>
                  </div>
                  <TimeChip ms={r.time_ms} status="record" />
                </Link>
              </li>
            ))}
            {records.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps here yet.</li>}
          </ul>
        </section>

        {kind === "track" && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Fastest overall, any car</h2>
            <ol className="card divide-y divide-line">
              {overall.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-5 text-center font-display text-sm font-extrabold ${i === 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <DriverLink d={b.driver} />
                    <div className="truncate text-xs text-muted">{b.car.name}</div>
                  </div>
                  <Link href={`/laps/${b.id}`}>
                    <TimeChip ms={b.time_ms} status={i === 0 ? "record" : "pb"} />
                  </Link>
                </li>
              ))}
              {overall.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps here yet.</li>}
            </ol>
          </section>
        )}
        {kind === "car" && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Who holds the most records in it</h2>
            <ol className="card divide-y divide-line">
              {Object.values(
                records.reduce<Record<string, { d: DriverLite; n: number }>>((acc, r) => {
                  (acc[r.driver_id] ??= { d: r.driver, n: 0 }).n++;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b.n - a.n)
                .map((x, i) => (
                  <li key={x.d.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`w-5 text-center font-display text-sm font-extrabold ${i === 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                    <DriverLink d={x.d} className="flex-1" />
                    <span className="font-mono text-sm font-bold text-record">{x.n}</span>
                  </li>
                ))}
              {records.length === 0 && <li className="p-6 text-center text-sm text-muted">No laps in this car yet.</li>}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}

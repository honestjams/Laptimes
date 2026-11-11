import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FolderOpen } from "lucide-react";
import { EntityEdit } from "@/components/entity-edit";
import { Avatar, CarPhoto, ImageCredit, TrackMap } from "@/components/media";
import { DriverLink, TimeChip, Verified } from "@/components/ui";
import { getEntityData, getMe, type EntityBest } from "@/lib/data";
import { trackLabel } from "@/lib/time";
import type { Car, DriverLite, Track } from "@/lib/types";

/** Shared page for one track (all cars) or one car (all tracks). */
export async function EntityPage({ kind, id }: { kind: "track" | "car"; id: number }) {
  const [{ entity, records, bests }, me] = await Promise.all([getEntityData(kind, id), getMe()]);
  if (!entity) notFound();
  const canEdit = !!me && (me.is_admin || me.id === entity.created_by);
  const track = kind === "track" ? (entity as Track) : null;
  const car = kind === "car" ? (entity as Car) : null;

  // For a track, "fastest overall" is each driver's quickest lap in any car.
  const overall: EntityBest[] = [];
  const seen = new Set<string>();
  for (const b of bests) {
    if (seen.has(b.driver_id)) continue;
    seen.add(b.driver_id);
    overall.push(b);
  }

  const title = track ? trackLabel(track) : entity.name;
  const tags = track ? [track.country, track.length_m ? `${(track.length_m / 1000).toFixed(2)} km` : null] : [car!.brand, car!.class];
  const folder = track ? [track.ac_folder, track.ac_layout].filter(Boolean).join(" / ") : car!.ac_folder;
  const sizes = "(min-width: 1024px) 560px, 100vw";

  return (
    <>
      <section className="card mb-6 grid overflow-hidden lg:grid-cols-2">
        {track ? <TrackMap track={track} sizes={sizes} eager className="aspect-[16/10] w-full" /> : <CarPhoto car={car!} sizes={sizes} eager className="aspect-[16/10] w-full" />}
        <div className="flex flex-col justify-center gap-3 border-t border-line p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="eyebrow">{kind === "track" ? "Track" : "Car"}</div>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {tags.filter(Boolean).map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
            {entity.is_mod && <span className="tag">Mod</span>}
            {folder && (
              <span className="tag font-mono" title="Assetto Corsa folder name">
                <FolderOpen size={12} /> {folder}
              </span>
            )}
          </div>
          {records[0] && (
            <div className="flex items-center gap-3">
              <TimeChip ms={records[0].time_ms} status="record" size="lg" />
              <div className="min-w-0 text-sm">
                <div className="text-muted">{kind === "track" ? "Fastest lap here" : "Its quickest record"}</div>
                <div className="truncate font-bold">
                  {records[0].driver.display_name} · {kind === "track" ? records[0].car.name : trackLabel(records[0].track)}
                </div>
              </div>
            </div>
          )}
          {entity.download_url && (
            <a href={entity.download_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline">
              Get the mod <ExternalLink size={13} />
            </a>
          )}
          <ImageCredit credit={entity.image_credit} sourceUrl={entity.image_source_url} />
        </div>
      </section>

      {canEdit && (
        <EntityEdit kind={kind} id={entity.id} userId={me!.id} folder={entity.ac_folder ?? ""} layoutFolder={track?.ac_layout ?? ""} url={entity.download_url ?? ""} cls={car?.class ?? ""} hasImage={!!entity.image_url} />
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-3 font-display text-lg font-bold">{kind === "track" ? "Records by car" : "Records by track"}</h2>
          <ul className="card divide-y divide-line">
            {records.map((r) => (
              <li key={`${r.track_id}-${r.car_id}`}>
                <Link href={`/combo/${r.track_id}/${r.car_id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 sm:px-4">
                  {kind === "track" ? <CarPhoto car={r.car} sizes="64px" className="h-11 w-16 shrink-0 rounded-lg" /> : <TrackMap track={r.track} sizes="64px" className="h-11 w-16 shrink-0 rounded-lg" />}
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
            {records.length === 0 && (
              <li className="p-6 text-center text-sm text-muted">
                No laps here yet. <Link href={`/log?${kind}=${entity.id}`} className="font-bold text-accent">Set the first one</Link>
              </li>
            )}
          </ul>
        </section>

        <section className="min-w-0">
          <h2 className="mb-3 font-display text-lg font-bold">{kind === "track" ? "Fastest overall, any car" : "Who holds the most records in it"}</h2>
          <ol className="card divide-y divide-line">
            {kind === "track" &&
              overall.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-5 text-center font-display text-sm font-extrabold ${i === 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                  <Avatar name={b.driver.display_name} seed={b.driver.username} size={32} />
                  <div className="min-w-0 flex-1">
                    <DriverLink d={b.driver} />
                    <div className="truncate text-xs text-muted">{b.car.name}</div>
                  </div>
                  <Link href={`/laps/${b.id}`}>
                    <TimeChip ms={b.time_ms} status={i === 0 ? "record" : "pb"} />
                  </Link>
                </li>
              ))}
            {kind === "car" &&
              Object.values(
                records.reduce<Record<string, { d: DriverLite; n: number }>>((acc, r) => {
                  (acc[r.driver_id] ??= { d: r.driver, n: 0 }).n++;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b.n - a.n)
                .map((x, i) => (
                  <li key={x.d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-5 text-center font-display text-sm font-extrabold ${i === 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                    <Avatar name={x.d.display_name} seed={x.d.username} size={32} />
                    <DriverLink d={x.d} className="flex-1" />
                    <span className="font-mono text-sm font-bold text-record">{x.n}</span>
                  </li>
                ))}
            {records.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing yet.</li>}
          </ol>
        </section>
      </div>
    </>
  );
}

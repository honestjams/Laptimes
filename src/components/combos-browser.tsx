"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CatalogCard } from "@/components/catalog-card";
import { CarPhoto, TrackMap } from "@/components/media";
import { TimeChip, Verified } from "@/components/ui";
import { trackLabel } from "@/lib/time";
import type { ComboRecord } from "@/lib/types";

type View = "combos" | "tracks" | "cars";

/** Searchable list of every combo, or grouped by track or by car. */
export function CombosBrowser({ records }: { records: ComboRecord[] }) {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [view, setView] = useState<View>("combos");

  const classes = useMemo(() => [...new Set(records.map((r) => r.car.class).filter(Boolean))].sort() as string[], [records]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records
      .filter((r) => !cls || r.car.class === cls)
      .filter((r) => !needle || `${trackLabel(r.track)} ${r.car.name} ${r.driver.display_name}`.toLowerCase().includes(needle))
      .sort((a, b) => trackLabel(a.track).localeCompare(trackLabel(b.track)) || a.time_ms - b.time_ms);
  }, [records, q, cls]);

  const groups = useMemo(() => {
    if (view === "combos") return [];
    const m = new Map<number, { id: number; name: string; sub: string; combos: number; drivers: Set<string>; best: ComboRecord }>();
    for (const r of filtered) {
      const id = view === "tracks" ? r.track_id : r.car_id;
      const g = m.get(id) ?? {
        id,
        name: view === "tracks" ? trackLabel(r.track) : r.car.name,
        sub: view === "tracks" ? (r.track.country ?? "") : (r.car.class ?? ""),
        combos: 0,
        drivers: new Set<string>(),
        best: r,
      };
      g.combos++;
      g.drivers.add(r.driver_id);
      if (r.time_ms < g.best.time_ms) g.best = r;
      m.set(id, g);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !pl-10" placeholder="Search track, car or driver" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        <select className="field sm:!w-44" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Car class">
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist">
        {(["combos", "tracks", "cars"] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-[38px] rounded-lg px-4 text-sm font-bold capitalize transition-colors ${view === v ? "bg-surface text-ink shadow-card" : "text-muted"}`}
          >
            {v === "combos" ? "Track + car" : `By ${v.slice(0, -1)}`}
          </button>
        ))}
      </div>

      {view === "combos" ? (
        <ul className="card divide-y divide-line">
          {filtered.map((r) => (
            <li key={`${r.track_id}-${r.car_id}`}>
              <Link href={`/combo/${r.track_id}/${r.car_id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2 sm:px-4">
                <div className="flex shrink-0">
                  <TrackMap track={r.track} sizes="64px" className="h-11 w-16 rounded-lg" />
                  <CarPhoto car={r.car} sizes="64px" className="-ml-3 hidden h-11 w-16 rounded-lg ring-2 ring-surface sm:block" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{trackLabel(r.track)}</div>
                  <div className="truncate text-sm text-muted">
                    {r.car.name}
                    {r.car.class && <span className="tag ml-2">{r.car.class}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <TimeChip ms={r.time_ms} status="record" />
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    {r.driver.display_name} <Verified on={r.is_verified} /> · {r.driver_count} {r.driver_count === 1 ? "driver" : "drivers"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-8 text-center text-sm text-muted">Nothing matches that search.</li>}
        </ul>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <CatalogCard
              key={g.id}
              kind={view === "tracks" ? "track" : "car"}
              id={g.id}
              name={g.name}
              image_url={view === "tracks" ? g.best.track.image_url : g.best.car.image_url}
              sub={g.sub}
              best={g.best.time_ms}
              footer={`${g.combos} ${view === "tracks" ? (g.combos === 1 ? "car" : "cars") : g.combos === 1 ? "track" : "tracks"} · fastest: ${view === "tracks" ? g.best.car.name : trackLabel(g.best.track)} (${g.best.driver.display_name})`}
            />
          ))}
          {groups.length === 0 && <div className="card p-8 text-center text-sm text-muted sm:col-span-2 lg:col-span-3">Nothing matches that search.</div>}
        </div>
      )}
    </div>
  );
}

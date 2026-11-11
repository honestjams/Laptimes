"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CatalogCard } from "@/components/catalog-card";

export type GalleryItem = { id: number; name: string; image_url: string | null; sub: string | null; group: string | null; best: number | null; footer: string; count: number };

/** Searchable picture grid of tracks or cars. */
export function Gallery({ kind, items, groupLabel }: { kind: "track" | "car"; items: GalleryItem[]; groupLabel: string }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const groups = useMemo(() => [...new Set(items.map((i) => i.group).filter(Boolean))].sort() as string[], [items]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter((i) => (!group || i.group === group) && (!n || `${i.name} ${i.sub ?? ""}`.toLowerCase().includes(n)));
  }, [items, q, group]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !pl-10" placeholder={`Search ${kind}s`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${kind}s`} />
        </div>
        {groups.length > 1 && (
          <select className="field sm:!w-48" value={group} onChange={(e) => setGroup(e.target.value)} aria-label={groupLabel}>
            <option value="">{groupLabel}</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i, n) => (
          <CatalogCard key={i.id} kind={kind} id={i.id} name={i.name} image_url={i.image_url} sub={i.sub} best={i.best} footer={i.footer} eager={n < 6} />
        ))}
      </div>
      {shown.length === 0 && <div className="card p-8 text-center text-sm text-muted">Nothing matches that search.</div>}
    </div>
  );
}

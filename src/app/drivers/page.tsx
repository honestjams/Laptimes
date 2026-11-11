import Link from "next/link";
import { Avatar } from "@/components/media";
import { PageHeader } from "@/components/ui";
import { getComboRecords, getDrivers } from "@/lib/data";

export const metadata = { title: "Drivers" };

export default async function DriversPage() {
  const [drivers, records] = await Promise.all([getDrivers(), getComboRecords()]);
  const recs = new Map<string, number>();
  for (const r of records) recs.set(r.driver_id, (recs.get(r.driver_id) ?? 0) + 1);
  const rows = drivers
    .map((p) => ({ p, records: recs.get(p.id) ?? 0 }))
    .sort((a, b) => b.records - a.records || b.p.combos - a.p.combos || a.p.display_name.localeCompare(b.p.display_name));

  return (
    <>
      <PageHeader eyebrow="Ranked by records held" title="Drivers" />
      <ol className="card divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.p.id}>
            <Link href={`/drivers/${r.p.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <span className={`w-6 text-center font-display text-sm font-extrabold ${i === 0 && r.records > 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
              <Avatar name={r.p.display_name} seed={r.p.username} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">
                  {r.p.display_name}
                  {r.p.is_placeholder && <span className="ml-1 text-xs font-semibold text-muted">(unclaimed)</span>}
                </div>
                <div className="text-xs text-muted">{r.p.combos} {r.p.combos === 1 ? "combo" : "combos"} driven</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-record">{r.records}</div>
                <div className="text-[11px] text-muted">records</div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

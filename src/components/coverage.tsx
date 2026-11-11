import Link from "next/link";
import { formatLapTime } from "@/lib/time";

export type Cell = { trackId: number; carId: number; time_ms: number; record: boolean };

/** Track x car grid: purple where the driver holds the record, green where they've set a time. */
export function Coverage({ tracks, cars, cells }: { tracks: { id: number; label: string }[]; cars: { id: number; label: string }[]; cells: Cell[] }) {
  const at = new Map(cells.map((c) => [`${c.trackId}-${c.carId}`, c]));
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Coverage</h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="grid h-4 w-4 place-items-center rounded bg-record text-[9px] font-black not-italic text-surface">R</i> Holds record</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-4 w-4 rounded bg-pb" /> Time set</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-4 w-4 rounded bg-surface-2" /> Not driven</span>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              {cars.map((c) => (
                <th key={c.id} className="h-28 w-7 align-bottom font-semibold text-muted">
                  <Link href={`/cars/${c.id}`} className="block w-7 truncate whitespace-nowrap hover:text-ink [writing-mode:vertical-rl] rotate-180 max-h-28" title={c.label}>
                    {c.label}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.id}>
                <th className="max-w-[9.5rem] truncate pr-2 text-right font-semibold text-muted">
                  <Link href={`/tracks/${t.id}`} className="hover:text-ink" title={t.label}>{t.label}</Link>
                </th>
                {cars.map((c) => {
                  const cell = at.get(`${t.id}-${c.id}`);
                  return (
                    <td key={c.id} className="p-0">
                      {cell ? (
                        <Link
                          href={`/combo/${t.id}/${c.id}`}
                          title={`${t.label} · ${c.label}: ${formatLapTime(cell.time_ms)}${cell.record ? " (record)" : ""}`}
                          className={`grid h-7 w-7 place-items-center rounded text-[10px] font-black text-surface transition-transform hover:scale-110 ${cell.record ? "bg-record" : "bg-pb"}`}
                        >
                          {cell.record ? "R" : ""}
                        </Link>
                      ) : (
                        <span className="block h-7 w-7 rounded bg-surface-2" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

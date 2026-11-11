"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatGap, formatLapTime } from "@/lib/time";

export type ChartLap = { id: number; time_ms: number; at: string; dated: boolean; combo: string; comboLabel: string };

/**
 * Personal best progression and consistency for one track + car combo.
 * One series only, so marks use the ink colour and the PB line uses the
 * "personal best" green that means the same thing everywhere else on the site.
 */
export function ProfileCharts({ laps }: { laps: ChartLap[] }) {
  const combos = useMemo(() => {
    const m = new Map<string, { key: string; label: string; n: number }>();
    for (const l of laps) {
      const c = m.get(l.combo) ?? { key: l.combo, label: l.comboLabel, n: 0 };
      c.n++;
      m.set(l.combo, c);
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [laps]);
  const [combo, setCombo] = useState(combos[0]?.key ?? "");
  const [table, setTable] = useState(false);

  const series = useMemo(() => {
    const rows = laps.filter((l) => l.combo === combo).sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
    const out: { i: number; time: number; pb: number; at: string; dated: boolean }[] = [];
    for (const l of rows) {
      const pb = Math.min(out.at(-1)?.pb ?? Infinity, l.time_ms);
      out.push({ i: out.length + 1, time: l.time_ms, pb, at: l.at, dated: l.dated });
    }
    return out;
  }, [laps, combo]);

  if (combos.length === 0) return null;
  const times = series.map((s) => s.time).sort((a, b) => a - b);
  const best = times[0];
  const median = times[Math.floor(times.length / 2)];
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const sd = Math.sqrt(times.reduce((a, b) => a + (b - mean) ** 2, 0) / times.length);
  const within = times.filter((t) => t - best <= 500).length;
  const pad = Math.max(200, (times[times.length - 1] - best) * 0.15);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Progress and consistency</h2>
        <select className="field !min-h-[40px] !w-auto max-w-full !py-1 !text-sm" value={combo} onChange={(e) => setCombo(e.target.value)} aria-label="Track and car">
          {combos.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label} ({c.n})
            </option>
          ))}
        </select>
      </div>

      {series.length < 2 ? (
        <p className="py-10 text-center text-sm text-muted">Only one lap logged on this combo. Log another to see the trend.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Best" value={formatLapTime(best)} />
            <Tile label="Typical lap (median)" value={formatLapTime(median)} />
            <Tile label="Spread (std dev)" value={`${(sd / 1000).toFixed(3)}s`} />
            <Tile label="Within 0.5s of best" value={`${within} of ${times.length}`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-pb" /> Personal best</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-muted" /> Each lap</span>
            </div>
            <button className="text-xs font-bold text-accent" onClick={() => setTable((t) => !t)}>{table ? "Show chart" : "Show as table"}</button>
          </div>

          {table ? (
            <div className="mt-2 max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr><th className="py-1">#</th><th>Date</th><th>Time</th><th>Gap to best</th></tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {series.map((s) => (
                    <tr key={s.i} className="border-t border-line">
                      <td className="py-1.5">{s.i}</td>
                      <td className="font-sans">{s.dated ? formatDate(s.at) : "Unknown"}</td>
                      <td>{formatLapTime(s.time)}</td>
                      <td>{formatGap(s.time - best)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-2 h-64 w-full" role="img" aria-label={`Lap times over ${series.length} laps, best ${formatLapTime(best)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="i" type="number" domain={[1, series.length]} allowDecimals={false} tickCount={Math.min(series.length, 8)} tick={{ fill: "var(--muted)", fontSize: 11 }} stroke="var(--line)" tickLine={false} label={{ value: "Lap number, oldest first", position: "insideBottom", offset: 0, fill: "var(--muted)", fontSize: 11 }} height={44} />
                  <YAxis domain={[Math.max(0, best - pad), times[times.length - 1] + pad]} tickFormatter={(v: number) => formatLapTime(v)} tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} stroke="var(--line)" tickLine={false} axisLine={false} width={68} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof series)[number] | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="card px-3 py-2 text-xs">
                          <div className="text-muted">Lap {p.i}{p.dated ? ` · ${formatDate(p.at)}` : ""}</div>
                          <div className="font-mono text-sm font-bold">{formatLapTime(p.time)}</div>
                          <div className="text-muted">{p.time === p.pb ? "Personal best at the time" : `${formatGap(p.time - p.pb)} off best`}</div>
                        </div>
                      );
                    }}
                  />
                  <Line type="stepAfter" dataKey="pb" stroke="var(--pb)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Scatter dataKey="time" fill="var(--muted)" stroke="var(--surface)" strokeWidth={2} r={5} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-1 text-xs text-muted">Lower is faster. The green line only drops when you beat your previous best.</p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <div className="font-mono text-base font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

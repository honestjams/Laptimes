"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import { DriverLink, TimeChip, Verified } from "@/components/ui";
import type { MyCrew } from "@/lib/data";
import { formatDate, formatGap, formatLapTime } from "@/lib/time";
import { ASSISTS, type DriverLite, type InputDevice, type Lap } from "@/lib/types";

type Row = Lap & { driver: DriverLite };

export function Leaderboard({ laps, meId, crews }: { laps: Row[]; meId: string | null; crews: MyCrew[] }) {
  const [noAssists, setNoAssists] = useState(false);
  const [verified, setVerified] = useState(false);
  const [device, setDevice] = useState<InputDevice | "">("");
  const [crew, setCrew] = useState<number | "">("");
  const [since, setSince] = useState("");
  const [cutoff, setCutoff] = useState(0);
  const pickSince = (days: string) => (setSince(days), setCutoff(days ? Date.now() - Number(days) * 86400000 : 0));
  const [allLaps, setAllLaps] = useState(false);

  const filtered = useMemo(() => {
    const members = crew === "" ? null : new Set(crews.find((c) => c.id === crew)?.memberIds ?? []);
    return laps.filter(
      (l) =>
        (!noAssists || !ASSISTS.some((a) => l[a.key])) &&
        (!verified || l.is_verified) &&
        (!device || l.input_device === device) &&
        (!members || members.has(l.driver_id)) &&
        (!cutoff || new Date(l.set_on ?? l.created_at).getTime() >= cutoff),
    );
  }, [laps, noAssists, verified, device, crew, crews, cutoff]);

  // laps arrive fastest first, so the first lap seen per driver is their best
  const bestIds = useMemo(() => {
    const seen = new Set<string>();
    const ids = new Set<number>();
    for (const l of filtered) {
      if (seen.has(l.driver_id)) continue;
      seen.add(l.driver_id);
      ids.add(l.id);
    }
    return ids;
  }, [filtered]);

  const rows = allLaps ? filtered : filtered.filter((l) => bestIds.has(l.id));
  const leader = rows[0];
  const mine = meId ? filtered.find((l) => l.driver_id === meId) : undefined;
  const maxGap = rows.length > 1 ? rows[rows.length - 1].time_ms - leader.time_ms : 0;

  // Theoretical best: the fastest sector 1 + sector 2 + sector 3 anyone has set here.
  const theo = useMemo(() => {
    const best = (k: "s1_ms" | "s2_ms" | "s3_ms") => Math.min(...filtered.map((l) => l[k] ?? Infinity));
    const t = best("s1_ms") + best("s2_ms") + best("s3_ms");
    return Number.isFinite(t) ? t : null;
  }, [filtered]);

  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button
      onClick={() => set(!on)}
      aria-pressed={on}
      className={`min-h-[38px] rounded-full border px-3.5 text-sm font-bold transition-colors ${
        on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {toggle(noAssists, setNoAssists, "No assists")}
        {toggle(verified, setVerified, "Verified only")}
        {toggle(allLaps, setAllLaps, "Show every lap")}
        <select className="field !min-h-[38px] !w-auto !rounded-full !py-1 !text-sm" value={device} onChange={(e) => setDevice(e.target.value as InputDevice | "")} aria-label="Input device">
          <option value="">Any device</option>
          <option value="wheel">Wheel</option>
          <option value="controller">Controller</option>
          <option value="keyboard">Keyboard</option>
        </select>
        <select className="field !min-h-[38px] !w-auto !rounded-full !py-1 !text-sm" value={since} onChange={(e) => pickSince(e.target.value)} aria-label="Date range">
          <option value="">All time</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
        {crews.length > 0 && (
          <select className="field !min-h-[38px] !w-auto !rounded-full !py-1 !text-sm" value={crew} onChange={(e) => setCrew(e.target.value ? Number(e.target.value) : "")} aria-label="Crew">
            <option value="">Everyone</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {(theo || (mine && leader && mine.id !== leader.id)) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {mine && leader && mine.id !== leader.id && (
            <span className="tag !text-sm">
              You are <b className="font-mono text-ink">{formatGap(mine.time_ms - leader.time_ms)}</b> off the record
            </span>
          )}
          {theo && (
            <span className="tag !text-sm" title="Fastest sector 1 + sector 2 + sector 3 set by anyone here">
              Theoretical best <b className="font-mono text-ink">{formatLapTime(theo)}</b>
            </span>
          )}
        </div>
      )}

      <ol className="card divide-y divide-line overflow-hidden">
        {rows.map((l, i) => {
          const gap = l.time_ms - leader.time_ms;
          const isMe = l.driver_id === meId;
          const status = i === 0 ? "record" : bestIds.has(l.id) ? "pb" : "slow";
          const used = ASSISTS.filter((a) => l[a.key]);
          return (
            <li key={l.id} className={`relative ${isMe ? "bg-surface-2/60" : ""}`}>
              {/* gap bar: how far behind the leader, relative to the slowest row */}
              {gap > 0 && maxGap > 0 && (
                <span aria-hidden className="absolute bottom-0 left-0 h-0.5 bg-accent/50" style={{ width: `${Math.max(2, (gap / maxGap) * 100)}%` }} />
              )}
              <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <span className={`w-6 shrink-0 text-center font-display text-sm font-extrabold ${i === 0 ? "text-record" : "text-muted"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <DriverLink d={l.driver} />
                    {isMe && <span className="tag !bg-accent !text-accent-ink">You</span>}
                    <Verified on={l.is_verified} />
                    {l.has_files && <Paperclip size={13} className="text-muted" aria-label="Has files" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                    <span>{formatDate(l.set_on) || "Date unknown"}</span>
                    {l.input_device && <span className="capitalize">{l.input_device}</span>}
                    {l.tyre && <span>{l.tyre}</span>}
                    {used.length > 0 && <span>{used.map((a) => a.short).join(" · ")}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <Link href={`/laps/${l.id}`} aria-label={`Open ${l.driver.display_name}'s lap`}>
                    <TimeChip ms={l.time_ms} status={status} />
                  </Link>
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {i === 0 ? "leader" : formatGap(gap)}
                    {mine && !isMe && i !== 0 && <span title="Gap to your best"> · you {formatGap(l.time_ms - mine.time_ms)}</span>}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-8 text-center text-sm text-muted">No laps match those filters.</li>}
      </ol>
    </div>
  );
}
